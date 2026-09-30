import React from 'react';

const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-neutral-200/80 dark:bg-neutral-800/80 rounded-md ${className}`.trim()}
      {...props}
    />
  );
};

export default Skeleton;
