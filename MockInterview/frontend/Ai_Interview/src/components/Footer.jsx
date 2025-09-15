// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  return (
    <section className="snap-start min-h-screen flex items-center justify-center border-t border-gray-100 bg-white">
      <footer className="text-center text-xs text-gray-500 px-4">
        © {new Date().getFullYear()} AI 면접 코치. All rights reserved.
      </footer>
    </section>
  );
};

export default Footer;
