// src/components/Footer.jsx
import React from "react";

export default function Footer({ containerClass = "max-w-[1100px]" }) {
  return (
    <footer className="w-full border-t">
      <div className={`${containerClass} mx-auto px-4 py-8 text-xs text-gray-500 flex items-center justify-between`}>
        <span>© 2025 AI 면접 코치. All rights reserved.</span>
        <span>문의: support@example.com</span>
      </div>
    </footer>
  );
}
