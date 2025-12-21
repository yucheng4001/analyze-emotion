import React from "react";
import movieData from "../src/data/movies(fake).json";

const MovieRecommendationModal = ({ emotion, onClose }) => {
  const movies = movieData[emotion] || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 w-full max-w-4xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gray-400 text-2xl"
        >
          ×
        </button>

        <h2 className="text-3xl font-black mb-6">
          為你推薦的電影
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {movies.map((m, i) => (
            <div key={i} className="flex bg-gray-50 rounded-2xl overflow-hidden shadow">
              <img
                src={m.poster}
                alt={m.title}
                className="w-40 object-cover"
              />
              <div className="p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold">{m.title}</h3>
                  <p className="text-gray-500 text-sm">
                    {m.rating} ｜ {m.runtime} 分鐘
                  </p>
                </div>

                <div className="mt-2 space-x-3">
                  {m.platforms.map((p, idx) => (
                    <a
                      key={idx}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm bg-black text-white px-3 py-1 rounded-full"
                    >
                      {p.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MovieRecommendationModal;
