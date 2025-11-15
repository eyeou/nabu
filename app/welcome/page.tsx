"use client";

import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
        {/* Programs Card */}
        <button
          onClick={() => router.push('/dashboard?view=programs')}
          className="group relative aspect-square bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-4 border-gray-200 hover:border-blue-400"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            {/* Circle representing lessons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-400"></div>
              <div className="w-12 h-12 rounded-full bg-blue-500"></div>
              <div className="w-12 h-12 rounded-full bg-blue-400"></div>
              <div className="w-12 h-12 rounded-full bg-blue-500"></div>
              <div className="w-12 h-12 rounded-full bg-blue-600"></div>
              <div className="w-12 h-12 rounded-full bg-blue-500"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Programs</h2>
          </div>
        </button>

        {/* Classes Card */}
        <button
          onClick={() => router.push('/dashboard?view=classes')}
          className="group relative aspect-square bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-4 border-gray-200 hover:border-green-400"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            {/* Circles representing students */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-400"></div>
              <div className="w-12 h-12 rounded-full bg-green-500"></div>
              <div className="w-12 h-12 rounded-full bg-green-400"></div>
              <div className="w-12 h-12 rounded-full bg-green-500"></div>
              <div className="w-12 h-12 rounded-full bg-green-600"></div>
              <div className="w-12 h-12 rounded-full bg-green-500"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Classes</h2>
          </div>
        </button>
      </div>
    </div>
  );
}
