import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages === 0) return null;

  const pages = [];

  // สร้างลิงก์หน้าก่อนหน้า
  const prevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  // สร้างลิงก์หน้าถัดไป
  const nextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  // สร้างเลขหน้าทั้งหมด (แสดงเต็มก็ได้ หรือจะทำ pagination แบบย่อก็ได้)
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center', gap: 8 }}>
      <button onClick={prevPage} disabled={currentPage === 1}>
        Prev
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            fontWeight: currentPage === page ? 'bold' : 'normal',
            textDecoration: currentPage === page ? 'underline' : 'none',
          }}
        >
          {page}
        </button>
      ))}

      <button onClick={nextPage} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
}
