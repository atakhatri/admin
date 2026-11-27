import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  signOut,
  unlink,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import {
  DOC_ID_REGEX,
  OWNER_EMAIL,
  SAMPLE_STARTER_PROJECTS,
  mergeProjectRecords,
  slugifyTitle,
} from './utils/projectHelpers';
import {
  SAMPLE_STARTER_GALLERY,
  getGridSlotDocId,
  organizeGalleryItems,
} from './utils/galleryHelpers';
import {
  SAMPLE_STARTER_BLOGS,
  normalizeBlogRecords,
  slugifyBlogTitle,
} from './utils/blogHelpers';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

export const OperationType = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
});

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export function isAuthorizedOwner(user) {
  return Boolean(
    user &&
      user.emailVerified === true &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === OWNER_EMAIL
  );
}

export async function signInWithGoogleOwner() {
  return signInWithPopup(auth, googleProvider);
}

export function getLinkedProviderIds(user) {
  if (!user || !Array.isArray(user.providerData)) return [];
  return user.providerData.map((p) => p?.providerId).filter(Boolean);
}

export async function signInWithGithubOwner() {
  try {
    return await signInWithPopup(auth, githubProvider);
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : '';
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'GitHub Sign-In is not enabled in Firebase Console yet. Enable GitHub under Authentication → Sign-in method.'
      );
    }
    if (code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'Your email is already registered with Google. Sign in with Google first, then click "Link GitHub" in Settings so both providers open the same account.'
      );
    }
    throw err;
  }
}

export async function linkGithubAccount() {
  if (!auth.currentUser) {
    throw new Error('Sign in with Google first before linking GitHub.');
  }
  try {
    const result = await linkWithPopup(auth.currentUser, githubProvider);
    await result.user.reload();
    return result.user;
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : '';
    if (code === 'auth/provider-already-linked') {
      return auth.currentUser;
    }
    if (code === 'auth/credential-already-in-use') {
      throw new Error(
        'That GitHub account is already attached to a separate Firebase user. Delete the extra GitHub user in Firebase Console → Authentication → Users, then click Link GitHub again.'
      );
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'GitHub Sign-In is not enabled in Firebase Console yet. Enable GitHub under Authentication → Sign-in method.'
      );
    }
    throw err;
  }
}

export async function unlinkGithubAccount() {
  if (!auth.currentUser) return null;
  const providers = getLinkedProviderIds(auth.currentUser);
  if (providers.length <= 1) {
    throw new Error('Keep at least one sign-in method connected to your account.');
  }
  const updated = await unlink(auth.currentUser, 'github.com');
  await updated.reload();
  return updated;
}

export async function signOutOwner() {
  return signOut(auth);
}

// Fire-and-forget instant SSE broadcast trigger after owner CRUD writes
export async function notifyPortfolioRevalidate(channel = 'all') {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const idToken = await currentUser.getIdToken();
    await fetch('/api/portfolio/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ channel }),
    });
  } catch {
    // Non-blocking: SSE background fingerprint check still reconciles if offline
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROJECTS CRUD
// ═══════════════════════════════════════════════════════════════════
export function subscribeOwnerProjects(ownerUid, onData, onError) {
  let publicDocs = [];
  let adminDocs = [];
  let publicReady = false;
  let adminReady = false;

  const emit = () => {
    if (publicReady && adminReady) {
      onData(mergeProjectRecords(publicDocs, adminDocs));
    }
  };

  const publicQuery = query(
    collection(db, 'public_projects'),
    where('ownerId', '==', ownerUid)
  );
  const adminQuery = query(
    collection(db, 'admin_projects'),
    where('ownerId', '==', ownerUid)
  );

  const unsubPublic = onSnapshot(
    publicQuery,
    (snapshot) => {
      publicDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      publicReady = true;
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'public_projects');
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );

  const unsubAdmin = onSnapshot(
    adminQuery,
    (snapshot) => {
      adminDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      adminReady = true;
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'admin_projects');
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );

  return () => {
    unsubPublic();
    unsubAdmin();
  };
}

export async function saveProjectPair({
  ownerUid,
  existingId,
  existingCreatedAt,
  publicData,
  adminData,
}) {
  const isNew = !existingId;
  const candidateId = existingId || `${slugifyTitle(publicData.slug)}-${Date.now().toString(36)}`;
  const projectId = DOC_ID_REGEX.test(candidateId)
    ? candidateId
    : `proj-${Date.now().toString(36)}`;

  const publicRef = doc(db, 'public_projects', projectId);
  const adminRef = doc(db, 'admin_projects', projectId);
  const batch = writeBatch(db);

  if (isNew) {
    batch.set(publicRef, {
      ownerId: ownerUid,
      ...publicData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(adminRef, {
      ownerId: ownerUid,
      projectId,
      ...adminData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Full document replacement preserves createdAt while cleanly dropping any legacy keys
    batch.set(publicRef, {
      ownerId: ownerUid,
      ...publicData,
      createdAt: existingCreatedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(adminRef, {
      ...adminData,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    notifyPortfolioRevalidate('projects');
    return projectId;
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `public_projects/${projectId}`
    );
  }
}

export async function toggleProjectPublished(project, nextPublished) {
  const path = `public_projects/${project.id}`;
  try {
    // Use set with exact clean schema so legacy docs upgrade seamlessly on toggle
    await setDoc(doc(db, 'public_projects', project.id), {
      ownerId: auth.currentUser?.uid || '',
      slug: project.slug,
      title: project.title,
      description: project.description,
      image: project.image,
      tags: project.tags,
      liveUrl: project.liveUrl,
      githubUrl: project.githubUrl,
      type: project.type,
      status: project.status,
      published: Boolean(nextPublished),
      featured: Boolean(project.featured),
      displayOrder: project.displayOrder,
      createdAt: project.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    notifyPortfolioRevalidate('projects');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleProjectFeatured(project, featured) {
  const path = `public_projects/${project.id}`;
  try {
    await setDoc(doc(db, 'public_projects', project.id), {
      ownerId: auth.currentUser?.uid || '',
      slug: project.slug,
      title: project.title,
      description: project.description,
      image: project.image,
      tags: project.tags,
      liveUrl: project.liveUrl,
      githubUrl: project.githubUrl,
      type: project.type,
      status: project.status,
      published: Boolean(project.published),
      featured: Boolean(featured),
      displayOrder: project.displayOrder,
      createdAt: project.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    notifyPortfolioRevalidate('projects');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function swapProjectDisplayOrder(projectA, projectB) {
  const uid = auth.currentUser?.uid || '';
  const batch = writeBatch(db);
  const buildClean = (proj, order) => ({
    ownerId: uid,
    slug: proj.slug,
    title: proj.title,
    description: proj.description,
    image: proj.image,
    tags: proj.tags,
    liveUrl: proj.liveUrl,
    githubUrl: proj.githubUrl,
    type: proj.type,
    status: proj.status,
    published: Boolean(proj.published),
    featured: Boolean(proj.featured),
    displayOrder: order,
    createdAt: proj.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'public_projects', projectA.id), buildClean(projectA, projectB.displayOrder));
  batch.set(doc(db, 'public_projects', projectB.id), buildClean(projectB, projectA.displayOrder));

  try {
    await batch.commit();
    notifyPortfolioRevalidate('projects');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `public_projects/${projectA.id}`);
  }
}

export async function deleteProjectPair(projectId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'admin_projects', projectId));
  batch.delete(doc(db, 'public_projects', projectId));
  try {
    await batch.commit();
    notifyPortfolioRevalidate('projects');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `public_projects/${projectId}`);
  }
}

export async function seedStarterProjects(ownerUid) {
  const batch = writeBatch(db);
  for (const item of SAMPLE_STARTER_PROJECTS) {
    const projectId = item.id;
    batch.set(doc(db, 'public_projects', projectId), {
      ownerId: ownerUid,
      slug: item.slug,
      title: item.title,
      description: item.description,
      image: item.image,
      tags: item.tags,
      liveUrl: item.liveUrl,
      githubUrl: item.githubUrl,
      type: item.type,
      status: item.status,
      published: item.published,
      featured: item.featured,
      displayOrder: item.displayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'admin_projects', projectId), {
      ownerId: ownerUid,
      projectId,
      authDashboardUrl: item.authDashboardUrl,
      dbDashboardUrl: item.dbDashboardUrl,
      hostingDashboardUrl: item.hostingDashboardUrl,
      monitoringUrl: item.monitoringUrl,
      environmentNotes: item.environmentNotes,
      providerTags: item.providerTags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    notifyPortfolioRevalidate('projects');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'public_projects');
  }
}

// ═══════════════════════════════════════════════════════════════════
// GALLERY CRUD (Section A: 5 Grid Slots + Section B: Unlimited Images)
// ═══════════════════════════════════════════════════════════════════
export function subscribeOwnerGallery(ownerUid, onData, onError) {
  const q = query(collection(db, 'public_gallery'), where('ownerId', '==', ownerUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(organizeGalleryItems(docs));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'public_gallery');
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}

export async function saveGalleryPhoto({ ownerUid, existingItem, data }) {
  const isGrid = data.section === 'grid';
  const photoId = isGrid
    ? getGridSlotDocId(data.slot)
    : existingItem?.id || `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const ref = doc(db, 'public_gallery', photoId);
  const isUpdate = Boolean(existingItem);

  try {
    if (isUpdate) {
      await updateDoc(ref, {
        title: data.title,
        imageUrl: data.imageUrl,
        alt: data.alt,
        category: data.category,
        displayOrder: data.displayOrder,
        published: Boolean(data.published),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: ownerUid,
        section: data.section,
        slot: data.slot,
        title: data.title,
        imageUrl: data.imageUrl,
        alt: data.alt,
        category: data.category,
        displayOrder: data.displayOrder,
        published: Boolean(data.published),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    notifyPortfolioRevalidate('gallery');
    return photoId;
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      `public_gallery/${photoId}`
    );
  }
}

export async function toggleGalleryPublished(photoId, published) {
  const path = `public_gallery/${photoId}`;
  try {
    await updateDoc(doc(db, 'public_gallery', photoId), {
      published: Boolean(published),
      updatedAt: serverTimestamp(),
    });
    notifyPortfolioRevalidate('gallery');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function swapGalleryOrder(itemA, itemB) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'public_gallery', itemA.id), {
    displayOrder: itemB.displayOrder,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'public_gallery', itemB.id), {
    displayOrder: itemA.displayOrder,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
    notifyPortfolioRevalidate('gallery');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `public_gallery/${itemA.id}`);
  }
}

export async function deleteGalleryPhoto(photoId) {
  const path = `public_gallery/${photoId}`;
  try {
    await deleteDoc(doc(db, 'public_gallery', photoId));
    notifyPortfolioRevalidate('gallery');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterGallery(ownerUid) {
  const batch = writeBatch(db);
  for (const item of SAMPLE_STARTER_GALLERY) {
    batch.set(doc(db, 'public_gallery', item.id), {
      ownerId: ownerUid,
      section: item.section,
      slot: item.slot,
      title: item.title,
      imageUrl: item.imageUrl,
      alt: item.alt,
      category: item.category,
      displayOrder: item.displayOrder,
      published: item.published,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
    notifyPortfolioRevalidate('gallery');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'public_gallery');
  }
}

// ═══════════════════════════════════════════════════════════════════
// BLOGS CRUD (Portfolio Articles CMS)
// ═══════════════════════════════════════════════════════════════════
export function subscribeOwnerBlogs(ownerUid, onData, onError) {
  const q = query(collection(db, 'public_blogs'), where('ownerId', '==', ownerUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(normalizeBlogRecords(docs));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'public_blogs');
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}

export async function saveBlogPost({ ownerUid, existingBlog, data }) {
  const isUpdate = Boolean(existingBlog?.id);
  const candidateId =
    existingBlog?.id || `${slugifyBlogTitle(data.slug)}-${Date.now().toString(36)}`;
  const blogId = DOC_ID_REGEX.test(candidateId)
    ? candidateId
    : `blog-${Date.now().toString(36)}`;

  const ref = doc(db, 'public_blogs', blogId);

  try {
    if (isUpdate) {
      await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: ownerUid,
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    notifyPortfolioRevalidate('blogs');
    return blogId;
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      `public_blogs/${blogId}`
    );
  }
}

export async function toggleBlogPublished(blogId, published) {
  const path = `public_blogs/${blogId}`;
  try {
    await updateDoc(doc(db, 'public_blogs', blogId), {
      published: Boolean(published),
      updatedAt: serverTimestamp(),
    });
    notifyPortfolioRevalidate('blogs');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleBlogFeatured(blogId, featured) {
  const path = `public_blogs/${blogId}`;
  try {
    await updateDoc(doc(db, 'public_blogs', blogId), {
      featured: Boolean(featured),
      updatedAt: serverTimestamp(),
    });
    notifyPortfolioRevalidate('blogs');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function swapBlogDisplayOrder(blogA, blogB) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'public_blogs', blogA.id), {
    displayOrder: blogB.displayOrder,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'public_blogs', blogB.id), {
    displayOrder: blogA.displayOrder,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
    notifyPortfolioRevalidate('blogs');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `public_blogs/${blogA.id}`);
  }
}

export async function deleteBlogPost(blogId) {
  const path = `public_blogs/${blogId}`;
  try {
    await deleteDoc(doc(db, 'public_blogs', blogId));
    notifyPortfolioRevalidate('blogs');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterBlogs(ownerUid) {
  const batch = writeBatch(db);
  for (const post of SAMPLE_STARTER_BLOGS) {
    batch.set(doc(db, 'public_blogs', post.id), {
      ownerId: ownerUid,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      author: post.author,
      category: post.category,
      tags: post.tags,
      publishedDate: post.publishedDate,
      readTime: post.readTime,
      published: post.published,
      featured: post.featured,
      displayOrder: post.displayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
    notifyPortfolioRevalidate('blogs');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'public_blogs');
  }
}
