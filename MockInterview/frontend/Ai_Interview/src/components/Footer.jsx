// src/components/Footer.jsx
import React from "react";

export default function Footer({ containerClass = "max-w-[1100px]" }) {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} AI 면접 코치. All rights reserved.
      </div>
    </footer>
  );
}
