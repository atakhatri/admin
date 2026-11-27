import React from 'react';

export default function Hero({ featured }) {
  const [line1, line2] = featured.headlineLines;
  const blurbLines = featured.blurbLines;

  return (
    <section className="hero" aria-label="Current weather overview">
      <div className="chip">Weather Forecast</div>

      <h1 className="headline" key={featured.id}>
        <span className="ln ln-1">
          <span>{line1}</span>
        </span>
        <span className="ln ln-2">
          <span>{line2}</span>
        </span>
      </h1>

      <p className="blurb">
        {blurbLines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < blurbLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    </section>
  );
}
