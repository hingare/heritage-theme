import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProductTile from './ProductTile.jsx';
import { announceCards, fromProductsJson, getJSON } from './lib.js';

// Step-by-step product finder. Each answer carries product tags; the result ranks the
// products of one collection by how many of the chosen tags they have.
export default function GiftFinder({ intro, questions, collection, limit, strings }) {
  const [step, setStep] = useState(intro ? -1 : 0);
  const [answers, setAnswers] = useState([]);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);
  const resultRef = useRef(null);
  const total = questions.length;
  const done = step >= total;

  useEffect(() => {
    if (!done || products || !collection) return;
    getJSON(`/collections/${collection}/products.json?limit=250`)
      .then((data) => setProducts((data.products || []).map(fromProductsJson)))
      .catch(() => setError(true));
  }, [done, products, collection]);

  const ranked = useMemo(() => {
    if (!products) return [];
    const wanted = answers.flatMap((a) => a.tags);
    return products
      .filter((p) => p.available)
      .map((p, index) => ({ p, index, score: wanted.filter((t) => p.tags.includes(t)).length }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map((r) => r.p);
  }, [products, answers, limit]);

  useEffect(() => {
    if (done && ranked.length && resultRef.current) announceCards(resultRef.current);
  }, [done, ranked]);

  const choose = (answer) => {
    setAnswers((prev) => [...prev.slice(0, step), answer]);
    setStep(step + 1);
  };
  const restart = () => { setAnswers([]); setStep(0); };

  if (step === -1) {
    return (
      <div className="tw-text-center tw-max-w-xl tw-mx-auto tw-animate-fade-up">
        {intro.subheading ? <span className="subheading">{intro.subheading}</span> : null}
        <h2>{intro.heading}</h2>
        {intro.text ? <p className="tw-opacity-80">{intro.text}</p> : null}
        <button type="button" className="btn tw-mt-6" onClick={() => setStep(0)}>{strings.start}</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="tw-animate-fade-up" aria-live="polite">
        <div className="section-header section-header--center">
          <span className="subheading">{strings.resultSubheading}</span>
          <h2>{strings.resultHeading}</h2>
          <p className="tw-m-0 tw-text-sm tw-opacity-75">{answers.map((a) => a.label).join(' · ')}</p>
        </div>
        {error ? <p className="tw-text-center">{strings.error}</p> : !products ? (
          <div className="tw-flex tw-justify-center tw-py-10"><span className="modal__loading tw-p-0" /></div>
        ) : ranked.length ? (
          <div ref={resultRef} className="grid" style={{ '--cols': Math.min(4, ranked.length) }}>
            {ranked.map((p, i) => <ProductTile key={p.id} product={p} strings={strings} delay={i * 80} />)}
          </div>
        ) : <p className="tw-text-center">{strings.empty}</p>}
        <div className="tw-text-center tw-mt-10">
          <button type="button" className="btn btn--secondary" onClick={restart}>{strings.restart}</button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  return (
    <div className="tw-max-w-3xl tw-mx-auto">
      <div className="tw-flex tw-items-center tw-justify-between tw-text-sm tw-mb-3">
        <span>{strings.step.replace('{{ current }}', step + 1).replace('{{ total }}', total)}</span>
        {step > 0 ? <button type="button" className="link-underline" onClick={() => setStep(step - 1)}>{strings.back}</button> : null}
      </div>
      <div className="tw-h-1 tw-rounded-full tw-bg-alt tw-overflow-hidden tw-mb-10" aria-hidden="true">
        <div className="tw-h-full tw-bg-accent tw-transition-all tw-duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <div key={step} className="tw-animate-fade-up">
        <h2 className="tw-text-center">{q.title}</h2>
        <div className={`tw-grid tw-gap-4 tw-mt-8 ${q.answers.length > 2 ? 'tw-grid-cols-2 md:tw-grid-cols-4' : 'tw-grid-cols-2'}`}>
          {q.answers.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => choose(a)}
              className={`tw-group tw-flex tw-flex-col tw-items-center tw-gap-3 tw-p-3 tw-rounded-card tw-border tw-border-line tw-transition hover:tw-border-text hover:-tw-translate-y-1 hover:tw-shadow-lg ${answers[step]?.label === a.label ? 'tw-border-text' : ''}`}
            >
              {a.image ? (
                <span className="media media--square tw-w-full">
                  <img src={a.image} alt="" loading="lazy" className="tw-transition-transform tw-duration-500 group-hover:tw-scale-105" />
                </span>
              ) : null}
              <span className="tw-font-medium tw-py-1">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
