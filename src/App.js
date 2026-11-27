import React, { Suspense, lazy, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import stormBg from './assets/images/storm_background_1795750121999.jpg';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGate from './components/AuthGate';
import AdminSidebar from './components/AdminSidebar';
import HubHeader from './components/HubHeader';
import HomeWeatherBar from './components/HomeWeatherBar';
import WorkspaceMetrics from './components/WorkspaceMetrics';
import ProjectsWorkspace from './components/ProjectsWorkspace';
import AtmosphereCanvas from './components/AtmosphereCanvas';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import {
  BlogCardsSkeleton,
  ConsolesTableSkeleton,
  GalleryWorkspaceSkeleton,
  WorkspaceFallbackSkeleton,
} from './components/ui/Skeleton';
import { ATMOSPHERE_MODES, resolveAtmosphereState } from './three/atmospherePresets';
import { organizeGalleryItems } from './utils/galleryHelpers';
import {
  auth,
  deleteBlogPost,
  deleteGalleryPhoto,
  deleteProjectPair,
  deleteTimelineEvent,
  isAuthorizedOwner,
  linkGithubAccount,
  saveBlogPost,
  saveGalleryPhoto,
  saveOwnerProfile,
  saveProjectPair,
  saveTimelineEvent,
  signInWithGithubOwner,
  signInWithGoogleOwner,
  signOutOwner,
  subscribeOwnerBlogs,
  subscribeOwnerGallery,
  subscribeOwnerProfile,
  subscribeOwnerProjects,
  subscribeOwnerTimeline,
  swapBlogDisplayOrder,
  swapGalleryOrder,
  swapProjectDisplayOrder,
  swapTimelineOrder,
  toggleBlogFeatured,
  toggleBlogPublished,
  toggleGalleryPublished,
  toggleProjectFeatured,
  toggleProjectPublished,
  unlinkGithubAccount,
} from './firebase';

const ProjectEditorModal = lazy(() => import('./components/ProjectEditorModal'));
const PortfolioProfileView = lazy(() => import('./components/PortfolioProfileView'));
const GalleryWorkspace = lazy(() => import('./components/GalleryWorkspace'));
const GalleryPhotoModal = lazy(() =>
  import('./components/GalleryWorkspace').then((mod) => ({
    default: mod.GalleryPhotoModal,
  }))
);
const BlogsWorkspace = lazy(() => import('./components/BlogsWorkspace'));
const BlogEditorModal = lazy(() => import('./components/BlogEditorModal'));
const ConsolesView = lazy(() => import('./components/ConsolesView'));
const PortfolioApiView = lazy(() => import('./components/PortfolioApiView'));
const SettingsView = lazy(() => import('./components/SettingsView'));

const VALID_SCENE_MODES = new Set(ATMOSPHERE_MODES.map((m) => m.id));

function getInitialSceneMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramMode = (params.get('scene') || '').toLowerCase();
    if (VALID_SCENE_MODES.has(paramMode)) return paramMode;
    const saved = window.localStorage.getItem('aurora_scene_mode_pref');
    if (saved && VALID_SCENE_MODES.has(saved)) return saved;
  } catch (_err) {
    // Ignore storage/URL errors
  }
  return 'live';
}

function AdminDashboardApp() {
  const [user, setUser] = useState(null);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingInProvider, setSigningInProvider] = useState('');
  const [authError, setAuthError] = useState('');
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [galleryState, setGalleryState] = useState(() => organizeGalleryItems([]));
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [firestoreError, setFirestoreError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [blogFilter, setBlogFilter] = useState('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoDraftConfig, setPhotoDraftConfig] = useState(null);

  const [blogEditorOpen, setBlogEditorOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);

  const [unit, setUnit] = useState(() => {
    try {
      return window.localStorage.getItem('aurora_unit_pref') === 'F' ? 'F' : 'C';
    } catch (_err) {
      return 'C';
    }
  });

  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [weatherStatusHint, setWeatherStatusHint] = useState('');

  const [sceneModeOverride, setSceneModeOverride] = useState(getInitialSceneMode);
  const [scenePaused, setScenePaused] = useState(false);
  const [lightningSeq, setLightningSeq] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem('aurora_unit_pref', unit);
    } catch (_err) {
      // Ignore storage quota errors
    }
  }, [unit]);

  useEffect(() => {
    try {
      window.localStorage.setItem('aurora_scene_mode_pref', sceneModeOverride);
    } catch (_err) {
      // Ignore storage quota errors
    }
  }, [sceneModeOverride]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      setAuthError('');
    });
    return () => unsub();
  }, []);

  const authorized = isAuthorizedOwner(user);
  const isUnauthorizedUser = Boolean(user && !authorized);

  const fetchWeatherByCoords = async (lat, lng) => {
    setWeatherLoading(true);
    setWeatherError('');
    setWeatherStatusHint('');
    try {
      const res = await fetch(
        `/api/weather/current?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      );
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Weather service returned an unexpected response.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load current weather.');
      }
      setWeather(data.weather);
      return true;
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Unable to load current weather.');
      return false;
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleRefreshCurrentLocationWeather = () => {
    if (!navigator.geolocation) {
      setWeatherStatusHint('Location access is not supported by this browser.');
      return;
    }
    setWeatherLoading(true);
    setWeatherError('');
    setWeatherStatusHint('Detecting current location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setWeatherLoading(false);
        setWeatherStatusHint('Allow location access in your browser, then click refresh.');
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 }
    );
  };

  useEffect(() => {
    if (!authorized || !user) {
      setProjects([]);
      setProjectsLoading(false);
      setGalleryState(organizeGalleryItems([]));
      setGalleryLoading(false);
      setBlogs([]);
      setBlogsLoading(false);
      setOwnerProfile(null);
      setTimelineEvents([]);
      return undefined;
    }

    setProjectsLoading(true);
    setGalleryLoading(true);
    setBlogsLoading(true);
    setFirestoreError('');

    const unsubProjects = subscribeOwnerProjects(
      user.uid,
      (merged) => {
        setProjects(merged);
        setProjectsLoading(false);
      },
      (err) => {
        setFirestoreError(err instanceof Error ? err.message : 'Unable to load projects.');
        setProjectsLoading(false);
      }
    );

    const unsubGallery = subscribeOwnerGallery(
      user.uid,
      (organized) => {
        setGalleryState(organized);
        setGalleryLoading(false);
      },
      (err) => {
        setFirestoreError(err instanceof Error ? err.message : 'Unable to load gallery.');
        setGalleryLoading(false);
      }
    );

    const unsubBlogs = subscribeOwnerBlogs(
      user.uid,
      (items) => {
        setBlogs(items);
        setBlogsLoading(false);
      },
      (err) => {
        setFirestoreError(err instanceof Error ? err.message : 'Unable to load blogs.');
        setBlogsLoading(false);
      }
    );

    const unsubProfile = subscribeOwnerProfile(
      user.uid,
      (docData) => {
        setOwnerProfile(docData);
      },
      (err) => {
        setFirestoreError(err instanceof Error ? err.message : 'Unable to load profile details.');
      }
    );

    const unsubTimeline = subscribeOwnerTimeline(
      user.uid,
      (items) => {
        setTimelineEvents(items);
      },
      (err) => {
        setFirestoreError(err instanceof Error ? err.message : 'Unable to load timeline.');
      }
    );

    return () => {
      unsubProjects();
      unsubGallery();
      unsubBlogs();
      unsubProfile();
      unsubTimeline();
    };
  }, [authorized, user]);

  useEffect(() => {
    if (!authorized || weather) return;
    handleRefreshCurrentLocationWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const handleSignInGoogle = async () => {
    setSigningInProvider('google');
    setAuthError('');
    try {
      await signInWithGoogleOwner();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSigningInProvider('');
    }
  };

  const handleSignInGithub = async () => {
    setSigningInProvider('github');
    setAuthError('');
    try {
      await signInWithGithubOwner();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GitHub Sign-In failed.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSigningInProvider('');
    }
  };

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutOwner();
      setLogoutModalOpen(false);
      setActiveTab('home');
    } finally {
      setSigningOut(false);
    }
  };

  const handleLinkGithub = async () => {
    const updatedUser = await linkGithubAccount();
    if (updatedUser) {
      setUser(auth.currentUser || updatedUser);
      setAuthRefreshTick((t) => t + 1);
    }
  };

  const handleUnlinkGithub = async () => {
    const updatedUser = await unlinkGithubAccount();
    if (updatedUser) {
      setUser(auth.currentUser || updatedUser);
      setAuthRefreshTick((t) => t + 1);
    }
  };

  // Projects handlers
  const handleOpenNewProject = () => {
    setEditingProject(null);
    setEditorOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditorOpen(true);
  };

  const handleSaveProject = async ({ existingId, existingCreatedAt, publicData, adminData }) => {
    if (!user) return;
    await saveProjectPair({
      ownerUid: user.uid,
      existingId,
      existingCreatedAt,
      publicData,
      adminData,
    });
  };

  const handleMoveProject = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= projects.length) return;
    const projectA = projects[fromIdx];
    const projectB = projects[toIdx];
    const normalizedA = { ...projectA, displayOrder: fromIdx + 1 };
    const normalizedB = { ...projectB, displayOrder: toIdx + 1 };
    await swapProjectDisplayOrder(normalizedA, normalizedB);
  };

  // Gallery handlers
  const handleOpenGridSlotEditor = (slot, existingItem) => {
    setPhotoDraftConfig({ section: 'grid', slot, existingItem });
    setPhotoModalOpen(true);
  };

  const handleOpenNewGalleryImage = () => {
    setPhotoDraftConfig({ section: 'gallery', slot: 0, existingItem: null });
    setPhotoModalOpen(true);
  };

  const handleEditGalleryImage = (existingItem) => {
    setPhotoDraftConfig({ section: 'gallery', slot: 0, existingItem });
    setPhotoModalOpen(true);
  };

  const handleSaveGalleryPhoto = async ({ existingItem, data }) => {
    if (!user) return;
    await saveGalleryPhoto({
      ownerUid: user.uid,
      existingItem,
      data,
    });
  };

  const handleMoveGalleryImage = async (fromIdx, toIdx) => {
    const imgs = galleryState.galleryImages;
    if (toIdx < 0 || toIdx >= imgs.length) return;
    const itemA = { ...imgs[fromIdx], displayOrder: fromIdx + 1 };
    const itemB = { ...imgs[toIdx], displayOrder: toIdx + 1 };
    await swapGalleryOrder(itemA, itemB);
  };

  // Blogs handlers
  const handleOpenNewBlog = () => {
    setEditingBlog(null);
    setBlogEditorOpen(true);
  };

  const handleEditBlog = (post) => {
    setEditingBlog(post);
    setBlogEditorOpen(true);
  };

  const handleSaveBlog = async ({ existingBlog, data }) => {
    if (!user) return;
    await saveBlogPost({
      ownerUid: user.uid,
      existingBlog,
      data,
    });
  };

  const handleMoveBlog = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= blogs.length) return;
    const blogA = { ...blogs[fromIdx], displayOrder: fromIdx + 1 };
    const blogB = { ...blogs[toIdx], displayOrder: toIdx + 1 };
    await swapBlogDisplayOrder(blogA, blogB);
  };

  // Portfolio Profile & Timeline handlers
  const handleSaveProfile = async ({ existingProfile, data }) => {
    if (!user) return;
    await saveOwnerProfile({
      ownerUid: user.uid,
      existingProfile,
      data,
    });
  };

  const handleSaveTimelineEvent = async ({ existingEvent, data }) => {
    if (!user) return;
    await saveTimelineEvent({
      ownerUid: user.uid,
      existingEvent,
      data,
    });
  };

  const handleMoveTimelineEvent = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= timelineEvents.length) return;
    const eventA = { ...timelineEvents[fromIdx], displayOrder: fromIdx + 1 };
    const eventB = { ...timelineEvents[toIdx], displayOrder: toIdx + 1 };
    await swapTimelineOrder(eventA, eventB);
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    await deleteTimelineEvent(eventId);
  };

  const publishedProjectsCount = projects.filter((p) => p.published).length;
  const draftProjectsCount = projects.length - publishedProjectsCount;
  const publishedBlogsCount = blogs.filter((b) => b.published).length;
  const consolesCount = projects.reduce((sum, p) => {
    const links = [
      p.authDashboardUrl,
      p.dbDashboardUrl,
      p.hostingDashboardUrl,
      p.monitoringUrl,
    ].filter(Boolean);
    return sum + links.length;
  }, 0);

  const publishedGalleryCount =
    galleryState.gridSlots.filter((s) => s.item && s.item.published).length +
    galleryState.galleryImages.filter((i) => i.published).length;

  const atmosphere = resolveAtmosphereState({
    weather,
    overrideMode: sceneModeOverride,
  });

  const isClearDay =
    atmosphere.preset.conditionCategory === 'clear' && Boolean(atmosphere.preset.isDaytime);

  const handlePrimaryHeaderAdd = () => {
    if (activeTab === 'gallery') {
      handleOpenNewGalleryImage();
    } else if (activeTab === 'blogs') {
      handleOpenNewBlog();
    } else {
      handleOpenNewProject();
    }
  };

  const defaultAuthor =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Owner');

  return (
    <>
      <AtmosphereCanvas
        preset={atmosphere.preset}
        paused={scenePaused}
        lightningSeq={lightningSeq}
        fallbackImage={stormBg}
      />

      {!authorized ? (
        <AuthGate
          authLoading={authLoading}
          user={user}
          isUnauthorizedUser={isUnauthorizedUser}
          authError={authError}
          signingInProvider={signingInProvider}
          onSignInGoogle={handleSignInGoogle}
          onSignInGithub={handleSignInGithub}
          onSignOut={handleConfirmSignOut}
        />
      ) : (
        <div
          className="hub-shell"
          data-testid="admin-hub-shell"
          data-clear-day={String(isClearDay)}
        >
          <AdminSidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setSearchQuery('');
            }}
            onSignOut={() => setLogoutModalOpen(true)}
          />

          <main className="hub-main">
            <HubHeader
              user={user}
              activeTab={activeTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onPrimaryAdd={handlePrimaryHeaderAdd}
              onOpenPortfolioProfile={() => {
                setActiveTab('profile');
                setSearchQuery('');
              }}
              onSignOut={() => setLogoutModalOpen(true)}
              weather={weather}
              isClearDay={isClearDay}
              stats={{
                totalProjects: projects.length,
                publishedProjects: publishedProjectsCount,
                draftProjects: draftProjectsCount,
                filledGridCount: galleryState.filledGridCount,
                galleryImagesCount: galleryState.galleryImages.length,
                totalBlogs: blogs.length,
                publishedBlogs: publishedBlogsCount,
              }}
            />

            {firestoreError && (
              <p className="field-error-banner" role="alert">
                {firestoreError}
              </p>
            )}

            {activeTab === 'home' && (
              <>
                <div className="home-hero-row">
                  <HomeWeatherBar
                    weather={weather}
                    loading={weatherLoading}
                    error={weatherError}
                    statusHint={weatherStatusHint}
                    unit={unit}
                    onRefresh={handleRefreshCurrentLocationWeather}
                  />

                  <WorkspaceMetrics
                    loading={projectsLoading || galleryLoading || blogsLoading}
                    projects={projects}
                    publishedProjectsCount={publishedProjectsCount}
                    galleryState={galleryState}
                    blogs={blogs}
                    publishedBlogsCount={publishedBlogsCount}
                    consolesCount={consolesCount}
                    onSelectTab={(tab) => {
                      setActiveTab(tab);
                      setSearchQuery('');
                    }}
                  />
                </div>

                <ProjectsWorkspace
                  projects={projects}
                  loading={projectsLoading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onNewProject={handleOpenNewProject}
                  onEditProject={handleEditProject}
                  onTogglePublish={toggleProjectPublished}
                  onToggleFeatured={toggleProjectFeatured}
                  onMoveProject={handleMoveProject}
                  onDeleteProject={deleteProjectPair}
                />
              </>
            )}

            {activeTab === 'projects' && (
              <ProjectsWorkspace
                projects={projects}
                loading={projectsLoading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onNewProject={handleOpenNewProject}
                onEditProject={handleEditProject}
                onTogglePublish={toggleProjectPublished}
                onToggleFeatured={toggleProjectFeatured}
                onMoveProject={handleMoveProject}
                onDeleteProject={deleteProjectPair}
              />
            )}

            {activeTab === 'gallery' && (
              <Suspense fallback={<GalleryWorkspaceSkeleton />}>
                <GalleryWorkspace
                  gridSlots={galleryState.gridSlots}
                  filledGridCount={galleryState.filledGridCount}
                  galleryImages={galleryState.galleryImages}
                  loading={galleryLoading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onOpenGridSlotEditor={handleOpenGridSlotEditor}
                  onOpenNewGalleryImage={handleOpenNewGalleryImage}
                  onEditGalleryImage={handleEditGalleryImage}
                  onTogglePublish={toggleGalleryPublished}
                  onMoveGalleryImage={handleMoveGalleryImage}
                  onDeletePhoto={deleteGalleryPhoto}
                />
              </Suspense>
            )}

            {activeTab === 'consoles' && (
              <Suspense fallback={<ConsolesTableSkeleton rows={4} />}>
                <ConsolesView
                  projects={projects}
                  loading={projectsLoading}
                  onEditProject={handleEditProject}
                  onNewProject={handleOpenNewProject}
                />
              </Suspense>
            )}

            {activeTab === 'api' && (
              <Suspense fallback={<WorkspaceFallbackSkeleton />}>
                <PortfolioApiView
                  publishedCount={publishedProjectsCount}
                  publishedGalleryCount={publishedGalleryCount}
                  publishedBlogsCount={publishedBlogsCount}
                />
              </Suspense>
            )}

            {activeTab === 'blogs' && (
              <Suspense fallback={<BlogCardsSkeleton count={3} />}>
                <BlogsWorkspace
                  blogs={blogs}
                  loading={blogsLoading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  blogFilter={blogFilter}
                  onBlogFilterChange={setBlogFilter}
                  onNewBlog={handleOpenNewBlog}
                  onEditBlog={handleEditBlog}
                  onTogglePublish={toggleBlogPublished}
                  onToggleFeatured={toggleBlogFeatured}
                  onMoveBlog={handleMoveBlog}
                  onDeleteBlog={deleteBlogPost}
                />
              </Suspense>
            )}

            {activeTab === 'profile' && (
              <Suspense fallback={<WorkspaceFallbackSkeleton />}>
                <PortfolioProfileView
                  profile={ownerProfile}
                  timeline={timelineEvents}
                  defaultName={defaultAuthor}
                  onSaveProfile={handleSaveProfile}
                  onSaveTimelineEvent={handleSaveTimelineEvent}
                  onMoveTimelineEvent={handleMoveTimelineEvent}
                  onDeleteTimelineEvent={handleDeleteTimelineEvent}
                />
              </Suspense>
            )}

            {activeTab === 'settings' && (
              <Suspense fallback={<WorkspaceFallbackSkeleton />}>
                <SettingsView
                  providerRefreshTick={authRefreshTick}
                  user={user}
                  unit={unit}
                  onChangeUnit={setUnit}
                  onSignOut={() => setLogoutModalOpen(true)}
                  onLinkGithub={handleLinkGithub}
                  onUnlinkGithub={handleUnlinkGithub}
                  sceneModeOverride={sceneModeOverride}
                  activePreset={atmosphere.preset}
                  liveWeather={weather}
                  scenePaused={scenePaused}
                  onSelectSceneMode={setSceneModeOverride}
                  onToggleScenePause={() => setScenePaused((prev) => !prev)}
                  onTriggerLightning={() => setLightningSeq((prev) => prev + 1)}
                />
              </Suspense>
            )}
          </main>

          {editorOpen && (
            <Suspense fallback={null}>
              <ProjectEditorModal
                open={editorOpen}
                project={editingProject}
                nextOrder={projects.length + 1}
                onClose={() => setEditorOpen(false)}
                onSave={handleSaveProject}
              />
            </Suspense>
          )}

          {photoModalOpen && (
            <Suspense fallback={null}>
              <GalleryPhotoModal
                open={photoModalOpen}
                draftConfig={photoDraftConfig}
                nextOrder={galleryState.galleryImages.length + 1}
                onClose={() => setPhotoModalOpen(false)}
                onSave={handleSaveGalleryPhoto}
              />
            </Suspense>
          )}

          {blogEditorOpen && (
            <Suspense fallback={null}>
              <BlogEditorModal
                open={blogEditorOpen}
                blog={editingBlog}
                nextOrder={blogs.length + 1}
                defaultAuthor={defaultAuthor}
                onClose={() => setBlogEditorOpen(false)}
                onSave={handleSaveBlog}
              />
            </Suspense>
          )}

          <LogoutConfirmModal
            open={logoutModalOpen}
            signingOut={signingOut}
            onCancel={() => setLogoutModalOpen(false)}
            onConfirm={handleConfirmSignOut}
          />
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AdminDashboardApp />
    </ErrorBoundary>
  );
}
