import React from 'react';
import Skeleton from './Skeleton';

const TableSkeleton = ({
  rows = 6,
  cols = 5,
  className = '',
  cellClassName = 'h-4 w-full max-w-[120px]'
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr
          key={rIdx}
          className={`border-b border-neutral-200/70 dark:border-neutral-800 ${className}`.trim()}
        >
          {Array.from({ length: cols }).map((_, cIdx) => {
            const isRight = cols > 6 && cIdx >= 5 && cIdx <= 8;
            return (
              <td key={cIdx} className={`py-3.5 px-4 align-middle ${isRight ? 'text-right' : ''}`}>
                <Skeleton className={`${cellClassName} ${isRight ? 'ml-auto' : ''}`.trim()} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
