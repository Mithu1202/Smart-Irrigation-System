"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm mb-1 font-medium">{label}</label>
      )}
      <input
        {...props}
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}