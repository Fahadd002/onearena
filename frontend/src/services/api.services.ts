import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

export const api = httpClient;

export type Turf = {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  area?: string | null;
  basePrice: string | number;
  slotMinutes: number;
  status: string;
  category: { id: string; name: string };
  facilities: Array<{ facility: { id: string; name: string } }>;
  packages: Array<{ id: string; name: string; price: string | number; active: boolean; facilities: Array<{ facility: { id: string; name: string } }> }>;
  priceRules: Array<{ id: string; dayOfWeek: number; startMinute: number; endMinute: number; price: string | number; active: boolean; startDate: string; endDate: string }>;
  images: Array<{ id: string; url: string; altText?: string | null; sortOrder: number }>;
};

export type TurfPayload = {
  name: string;
  categoryId: string;
  description?: string;
  address: string;
  area?: string;
  basePrice: number;
  slotMinutes?: number;
  latitude?: number;
  longitude?: number;
};

export const fetchTurfs = (query?: { area?: string; categoryId?: string; minPrice?: number; maxPrice?: number }) => {
  const params = new URLSearchParams();
  if (query?.area) params.set("area", query.area);
  if (query?.categoryId) params.set("categoryId", query.categoryId);
  if (query?.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query?.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  const qs = params.toString();
  return httpClient.get<Turf[]>(`${API_ENDPOINTS.marketplace.turfs}${qs ? `?${qs}` : ""}`);
};

export const fetchTurf = (turfId: string) => httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}`);

export const createTurf = (payload: TurfPayload) => httpClient.post<Turf>(API_ENDPOINTS.marketplace.ownerTurfs, payload);

export const updateTurf = (turfId: string, payload: Partial<TurfPayload>) => httpClient.patch<Turf>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}`, payload);

export const deleteTurf = (turfId: string) => httpClient.delete(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}`);

export const fetchOwnerTurfs = () => httpClient.get<Turf[]>(API_ENDPOINTS.marketplace.ownerTurfs);

export type PackagePayload = {
  name: string;
  description?: string;
  price: number;
  facilityIds?: string[];
};

export const fetchPackages = (turfId: string) => httpClient.get<any[]>(`/turfs/${turfId}/packages`);

export const createPackage = (turfId: string, payload: PackagePayload) => httpClient.post(`/owner/turfs/${turfId}/packages`, payload);

export const updatePackage = (packageId: string, payload: PackagePayload) => httpClient.patch(`/owner/packages/${packageId}`, payload);

export const deletePackage = (packageId: string) => httpClient.delete(`/owner/packages/${packageId}`);

export type Facility = { id: string; name: string };

export const fetchFacilities = () => httpClient.get<Facility[]>(API_ENDPOINTS.marketplace.facilities);

export const fetchTurfFacilities = (turfId: string) => httpClient.get<any[]>(`/turfs/${turfId}/facilities`);

export const assignTurfFacilities = (turfId: string, facilityIds: string[]) => httpClient.post(`/owner/turfs/${turfId}/facilities`, { facilityIds });

export type PriceRulePayload = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  price: number;
  active?: boolean;
  startDate: string;
  endDate: string;
};

export const fetchPriceRules = (turfId: string, date?: string) =>
  httpClient.get<any[]>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing${date ? `?date=${date}` : ""}`);

export const createPriceRule = (turfId: string, payload: PriceRulePayload) => httpClient.post(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing`, payload);

export const createPriceRuleBulk = (turfId: string, payload: Omit<PriceRulePayload, "dayOfWeek">) =>
  httpClient.post(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing/bulk`, payload);

export const updatePriceRule = (priceRuleId: string, payload: Partial<PriceRulePayload>) => httpClient.patch(`${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`, payload);

export const deletePriceRule = (priceRuleId: string) => httpClient.delete(`${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`);
