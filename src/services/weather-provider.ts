import { mockResult } from "./provider-utils";
import type { DataProvider, WeatherData } from "./types";

export class MockWeatherProvider implements DataProvider<WeatherData[]> {
  async getData() {
    return mockResult([
      { matchupId: "sea-vs-sf", summary: "Cool, light marine wind", impact: 2, temperature: 61, windMph: 7 },
      { matchupId: "lad-vs-col", summary: "Warm with carry to left", impact: 8, temperature: 84, windMph: 11 },
      { matchupId: "nyy-vs-bos", summary: "Crosswind, low precipitation risk", impact: -2, temperature: 72, windMph: 9 },
    ], "STRATIQA mock weather");
  }
}
