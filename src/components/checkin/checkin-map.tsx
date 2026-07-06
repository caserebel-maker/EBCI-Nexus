'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const officeIcon = new L.DivIcon({
    html: `<div style="background:#561e23;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font-size:14px;">🏢</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    className: '',
})

const userIcon = new L.DivIcon({
    html: `<div style="background:#10b981;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.4);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: '',
})

interface CheckinMapProps {
    officeLat: number
    officeLng: number
    officeName: string
    radiusMeters: number
    userLat: number | null
    userLng: number | null
    distanceMeters: number | null
}

function FitBounds({ officeLat, officeLng, userLat, userLng }: {
    officeLat: number
    officeLng: number
    userLat: number | null
    userLng: number | null
}) {
    const map = useMap()
    useEffect(() => {
        if (userLat !== null && userLng !== null) {
            const bounds = L.latLngBounds([
                [officeLat, officeLng],
                [userLat, userLng],
            ])
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
        } else {
            map.setView([officeLat, officeLng], 17)
        }
    }, [map, officeLat, officeLng, userLat, userLng])
    return null
}

export function CheckinMap({
    officeLat,
    officeLng,
    officeName,
    radiusMeters,
    userLat,
    userLng,
    distanceMeters,
}: CheckinMapProps) {
    const isAtOffice = distanceMeters !== null && distanceMeters <= radiusMeters
    const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('light')

    useEffect(() => {
        const saved = localStorage.getItem('ebci_map_theme')
        if (saved === 'dark' || saved === 'light') setMapTheme(saved)
    }, [])

    const toggleTheme = () => {
        const next = mapTheme === 'dark' ? 'light' : 'dark'
        setMapTheme(next)
        localStorage.setItem('ebci_map_theme', next)
    }

    const tileUrl = mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

    const circleColor = mapTheme === 'dark' ? '#fbbf24' : '#561e23'

    return (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="h-64 w-full relative z-0">
                <button
                    onClick={toggleTheme}
                    className="absolute top-3 right-3 z-[1000] h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center text-xl transition-all"
                    title={mapTheme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
                    type="button"
                >
                    {mapTheme === 'dark' ? '☀️' : '🌙'}
                </button>
                <MapContainer
                    key={mapTheme}
                    center={[officeLat, officeLng]}
                    zoom={17}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={tileUrl}
                        subdomains="abcd"
                    />
                    <Circle
                        center={[officeLat, officeLng]}
                        radius={radiusMeters}
                        pathOptions={{
                            color: circleColor,
                            fillColor: circleColor,
                            fillOpacity: 0.12,
                            weight: 2,
                        }}
                    />
                    <Marker position={[officeLat, officeLng]} icon={officeIcon}>
                        <Popup>{officeName}</Popup>
                    </Marker>
                    {userLat !== null && userLng !== null && (
                        <Marker position={[userLat, userLng]} icon={userIcon}>
                            <Popup>คุณอยู่ที่นี่</Popup>
                        </Marker>
                    )}
                    <FitBounds officeLat={officeLat} officeLng={officeLng} userLat={userLat} userLng={userLng} />
                </MapContainer>
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isAtOffice ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-sm text-white/80">
                        {distanceMeters === null
                            ? 'กำลังตรวจตำแหน่ง...'
                            : isAtOffice
                                ? `อยู่ในรัศมีออฟฟิศ`
                                : `ห่างจากออฟฟิศ ${Math.round(distanceMeters)} เมตร`}
                    </span>
                </div>
                <span className="text-xs text-white/50">รัศมี {radiusMeters} ม.</span>
            </div>
        </div>
    )
}
