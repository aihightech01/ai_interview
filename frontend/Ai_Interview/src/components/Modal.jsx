import React, { useRef, useEffect } from "react";

const Modal = ({ children, isOpen, onClose, hideHeader, title }) => {
   const modalRef = useRef(null);

  // 바깥 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose(); // 모달 닫기 실행
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
   

  if (!isOpen) return null; // isOpen이 false면 렌더 안함
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      {/* 모달 컨텐츠 */}
      <div
      ref={modalRef}   
      className="relative flex flex-col bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-md">
        
        {/* 모달 헤더 */}
        {!hideHeader && (
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="md:text-lg font-medium text-gray-800">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-orange-100 hover:text-gray-900 rounded-lg text-sm w-8 h-8 flex justify-center items-center absolute top-3.5 right-3.5 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 14 14"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 1l12 12M13 1 1 13"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 모달 본문 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
