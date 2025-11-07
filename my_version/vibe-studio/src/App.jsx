import React from "react";
import "./index.css";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper font-serif text-gray-800">
      <div className="relative w-[400px]">
        {/* 🦋 Butterfly */}
        <img
          src="/butterfly.png"
          alt="butterfly"
          className="absolute top-[-35px] left-6 w-[70px] opacity-90 rotate-[-6deg] z-20"
        />

        {/* 📄 Card */}
        <div className="relative card-bg w-[320px] p-6 rounded-md shadow-lg rotate-[-1.5deg] hover:rotate-0 hover:-translate-y-[3px] hover:shadow-xl transition-all duration-300 ease-in-out z-10">
          <h2 className="font-['Playfair_Display'] text-3xl mb-4 font-bold text-[#29967F]">
            Hello World
          </h2>
          <p className="leading-relaxed text-[15px] text-[#475272]">
            hello world hello world hello world hello world hello world hello world 
            hello world hello world hello world hello world hello world hello world 
            hello world hello world hello world hello world hello world hello world 
            hello world hello world hello world hello world hello world
          </p>

          {/* Tape */}
          <div className="tape"></div>

          {/* Paper clip */}
          <div className="clip"></div>
        </div>
      </div>
    </div>
  );
}
