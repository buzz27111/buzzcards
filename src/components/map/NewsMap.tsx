'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Article, Category } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/constants';

// Fix default marker icon issue with webpack/next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createCategoryIcon(category: Category): L.DivIcon {
  const color = CATEGORY_COLORS[category]?.mapMarker ?? '#6B7280';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px;
      height: 14px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

/** Adjusts map bounds to fit all markers */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    }
  }, [map, positions]);
  return null;
}

export default function NewsMap() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles?limit=100')
      .then((res) => res.json())
      .then((data: { articles: Article[] }) => {
        setArticles(
          (data.articles ?? []).filter(
            (a) => a.geoLocation && a.geoLocation.lat != null && a.geoLocation.lng != null,
          ),
        );
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const positions = useMemo<[number, number][]>(
    () =>
      articles.map((a) => [a.geoLocation!.lat, a.geoLocation!.lng]),
    [articles],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-foreground/60">
        <p>No geo-located articles available.</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={12}
      scrollWheelZoom
      dragging
      touchZoom
      doubleClickZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      {articles.map((article) => (
        <Marker
          key={article.id}
          position={[article.geoLocation!.lat, article.geoLocation!.lng]}
          icon={createCategoryIcon(article.category)}
        >
          <Popup maxWidth={280} minWidth={200}>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold leading-tight text-gray-900">
                {article.title}
              </h3>
              {article.summary && (
                <p className="text-xs leading-snug text-gray-600">
                  {article.summary.length > 120
                    ? article.summary.slice(0, 120) + '…'
                    : article.summary}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[article.category]?.mapMarker ?? '#6B7280',
                  }}
                >
                  {article.category}
                </span>
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Read more →
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
