# Google Maps setup

SignalCheck uses Google Places autocomplete for route starting points, destinations, and the report's **Location or nearby landmark** field. Search is global: there is no country restriction or hardcoded Nigeria bias. Users can include a city or country to distinguish places with similar names.

Selecting a suggestion retains its Google Place ID. Editing the field clears that selection; swapping route endpoints swaps both labels and IDs. Reports persist the selected ID for analysis retries and resolve its coordinates on the server. These coordinates populate the incident and feed the existing 600-metre route proximity calculation. A location selected by the reporter takes precedence over an AI-extracted place name. Failed resolution leaves coordinates unknown rather than inventing a point. A broad district selection represents that district's map location; choosing a nearby landmark or specific address is more precise.

## 1. Enable the services

In [Google Cloud Console](https://console.cloud.google.com/), select or create the project and enable billing. Under **APIs & Services → Library**, enable:

- Places API (New)
- Geocoding API
- Routes API
- Maps JavaScript API

See Google's [getting started guide](https://developers.google.com/maps/get-started).

## 2. Create two API keys

Under **APIs & Services → Credentials → Create credentials → API key**:

| Key                 | API restrictions                            | Application restrictions                                                                                          |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SignalCheck server  | Places API (New), Geocoding API, Routes API | Server IP addresses if you have static public outbound IPs. Do not use website/referrer restrictions on this key. |
| SignalCheck browser | Maps JavaScript API only                    | Websites: allow your local development origins and actual deployed site.                                          |

For the browser key's local website restrictions, add the addresses you use:

```text
http://localhost:3000/*
http://127.0.0.1:3000/*
http://localhost:3001/*
http://127.0.0.1:3001/*
```

Add your deployed HTTPS domain separately when deploying. For local development without a static outbound IP, the server key can use **None** for application restrictions while retaining the three API restrictions; keep it server-only. Review the [Google key security guidance](https://developers.google.com/maps/api-security-best-practices) when configuring production hosting.

## 3. Add the keys locally

Edit the existing `.env.local` without replacing its other settings:

```dotenv
GOOGLE_MAPS_API_KEY=your_server_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key
```

Do not paste the server key into chat or commit it. The old Mapbox variable is unused. An optional `NEXT_PUBLIC_GOOGLE_MAP_ID` accepts your own JavaScript map ID; the demo defaults to Google's `DEMO_MAP_ID`.

Restart the dev server after adding keys. For a deployment, set both environment variables in the host and rebuild, because Next.js embeds the browser key during the build.

## 4. Verify with real Google responses

Automated tests mock Google and do not establish live location coverage. After adding the keys:

1. On Routes, try `Lugbe`, `Lugbe Abuja`, `Kubwa`, and `Wuse Abuja`. Select suggestions by their full location labels.
2. Try an international query such as `London UK`; it must not be filtered out.
3. Select both endpoints, swap them, and check the route. Confirm the Google map and route geometry load.
4. Submit a clearly identified test report using a specific landmark near that route. Check the saved evidence modal's location and the route's nearby incidents. Route matching uses coordinates, active evidence, and a 600-metre buffer; stale/resolved reports are excluded, and live route checks exclude fictional demo incidents.

If suggestions are unavailable, check billing, API enablement, and the server key restrictions. If suggestions work but the map fails, check the browser key's website restrictions and Maps JavaScript API access. Without credentials the app keeps manual location entry and an accessible location list; it does not simulate directions.
