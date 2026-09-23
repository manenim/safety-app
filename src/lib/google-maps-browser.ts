"use client";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let loading:
  | Promise<{
      maps: google.maps.MapsLibrary;
      marker: google.maps.MarkerLibrary;
    }>
  | undefined;
export function loadGoogleMaps(apiKey: string) {
  if (!loading) {
    setOptions({ key: apiKey, v: "weekly", language: "en" });
    loading = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ]).then(([maps, marker]) => ({ maps, marker }));
  }
  return loading;
}
