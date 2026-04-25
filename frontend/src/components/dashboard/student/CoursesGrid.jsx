import React from 'react';
import EmptyState from '../EmptyState';

export default function CoursesGrid({ courses = [] }) {
  if (!courses.length) {
    return (
      <EmptyState
        title="No courses yet"
        description="Once your promo is linked to modules, your courses will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <article
          key={course.moduleId}
          className="bg-surface rounded-lg border border-edge shadow-card p-5"
        >
          <p className="text-xs font-mono text-ink-tertiary uppercase tracking-wider">
            {course.moduleCode || 'N/A'}
          </p>
          <h3 className="text-sm font-semibold text-ink mt-1 leading-snug">
            {course.moduleName || 'Untitled module'}
          </h3>
        </article>
      ))}
    </div>
  );
}
