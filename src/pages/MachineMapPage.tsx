import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMachines, useRenters } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, MapPin, AlertCircle } from "lucide-react";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const statusColors: Record<string, string> = {
  assigned: "#2563eb",
  rented: "#2563eb",
  available: "#6b7280",
  maintenance: "#d97706",
  retired: "#9ca3af",
};

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

interface GeoCache {
  [address: string]: { lat: number; lng: number } | null;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

export default function MachineMapPage() {
  const { data: machines = [], isLoading: loadingMachines } = useMachines();
  const { data: renters = [], isLoading: loadingRenters } = useRenters();
  const [geoCache, setGeoCache] = useState<GeoCache>({});
  const [geocoding, setGeocoding] = useState(false);

  const renterMap = useMemo(() => {
    const m: Record<string, typeof renters[0]> = {};
    renters.forEach(r => { m[r.id] = r; });
    return m;
  }, [renters]);

  // Build machine-to-address mapping
  const machineAddresses = useMemo(() => {
    return machines.map(machine => {
      const renter = machine.assigned_renter_id ? renterMap[machine.assigned_renter_id] : null;
      const address = renter?.address || null;
      return { machine, renter, address };
    });
  }, [machines, renterMap]);

  const uniqueAddresses = useMemo(() => {
    const addrs = new Set<string>();
    machineAddresses.forEach(({ address }) => {
      if (address && address.trim()) addrs.add(address.trim());
    });
    return Array.from(addrs);
  }, [machineAddresses]);

  // Geocode addresses with rate limiting
  const geocodeAddresses = useCallback(async () => {
    const toGeocode = uniqueAddresses.filter(a => !(a in geoCache));
    if (toGeocode.length === 0) return;

    setGeocoding(true);
    const newCache: GeoCache = { ...geoCache };

    for (const addr of toGeocode) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
          { headers: { "User-Agent": "LaundryLord/1.0" } }
        );
        const data = await res.json();
        if (data.length > 0) {
          newCache[addr] = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
          newCache[addr] = null;
        }
      } catch {
        newCache[addr] = null;
      }
      // Rate limit: 1 req/sec for Nominatim
      await new Promise(r => setTimeout(r, 1100));
    }

    setGeoCache(newCache);
    setGeocoding(false);
  }, [uniqueAddresses, geoCache]);

  useEffect(() => {
    if (!loadingMachines && !loadingRenters && uniqueAddresses.length > 0) {
      geocodeAddresses();
    }
  }, [loadingMachines, loadingRenters, uniqueAddresses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Split machines into mapped vs unmatched
  const { mapped, unmatched } = useMemo(() => {
    const mapped: Array<{ machine: typeof machines[0]; renter: typeof renters[0] | null; address: string; lat: number; lng: number }> = [];
    const unmatched: Array<{ machine: typeof machines[0]; renter: typeof renters[0] | null; reason: string }> = [];

    machineAddresses.forEach(({ machine, renter, address }) => {
      if (!address || !address.trim()) {
        unmatched.push({ machine, renter, reason: renter ? "No address on file" : "Not assigned to a renter" });
        return;
      }
      const geo = geoCache[address.trim()];
      if (geo) {
        mapped.push({ machine, renter, address: address.trim(), lat: geo.lat, lng: geo.lng });
      } else if (geo === null) {
        unmatched.push({ machine, renter, reason: "Address could not be geocoded" });
      }
      // If geo is undefined, still geocoding — don't put in unmatched yet
    });

    return { mapped, unmatched };
  }, [machineAddresses, geoCache]);

  const positions: [number, number][] = mapped.map(m => [m.lat, m.lng]);
  const isLoading = loadingMachines || loadingRenters;

  // Default center: Atlanta
  const defaultCenter: [number, number] = [33.749, -84.388];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Machine Map
        </h1>
        {geocoding && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
            Geocoding addresses…
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-3">
          {/* Map */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <MapContainer
                center={defaultCenter}
                zoom={10}
                style={{ height: "calc(100vh - 180px)", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {positions.length > 0 && <FitBounds positions={positions} />}
                {mapped.map((item, i) => (
                  <Marker
                    key={`${item.machine.id}-${i}`}
                    position={[item.lat, item.lng]}
                    icon={createIcon(statusColors[item.machine.status] || "#6b7280")}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[160px]">
                        <div className="font-semibold">{item.machine.type} — {item.machine.model}</div>
                        <div className="text-muted-foreground">SN: {item.machine.serial}</div>
                        {item.renter && <div>Renter: <strong>{item.renter.name}</strong></div>}
                        <div className="text-muted-foreground">{item.address}</div>
                        <Badge variant="outline" className="text-[10px] mt-1">{item.machine.status}</Badge>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Unmatched Machines */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Not on Map ({unmatched.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {unmatched.length === 0 ? (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground">All machines are mapped.</p>
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-260px)] overflow-y-auto">
                  {unmatched.map(({ machine, renter, reason }) => (
                    <div key={machine.id} className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Box className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{machine.type} — {machine.model}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
                        SN: {machine.serial}
                      </div>
                      {renter && (
                        <div className="text-[10px] text-muted-foreground ml-[18px]">
                          Renter: {renter.name}
                        </div>
                      )}
                      <div className="text-[10px] text-warning ml-[18px]">{reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="lg:col-span-2 flex items-center gap-4 text-[10px] text-muted-foreground px-1">
            {Object.entries({ assigned: "Assigned/Rented", available: "Available", maintenance: "Maintenance", retired: "Retired" }).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
