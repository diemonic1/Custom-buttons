import type { AppOverview } from '../types';

const GAME_ID_CACHE_STORAGE_KEY = 'Custom-buttons-game-id-cache-v2';
const STEAM_SEARCH_APPS_URL = 'https://steamcommunity.com/actions/SearchApps/';

//#region Game name matching

// Steam ranks its search results by popularity, not by how well they match the
// query, so 'Sniper Ghost Warrior 3' comes back behind two Contracts games.
// These helpers pick the entry whose name is actually the closest one.

type NormalizedName = {
	full: string;
	core: string;
	core_tokens: string[];
	numbers: string;
	noisy: boolean;
};

type SearchResult = {
	appid?: string | number;
	name?: unknown;
};

// Only numerals of two letters or more. Converting single letters would collide
// 'Mega Man X' with 'Mega Man 10' and 'GTA V' with 'GTA 5'.
const ROMAN_NUMERALS: Record<string, string> = {
	ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9',
	xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16',
	xvii: '17', xviii: '18', xix: '19', xx: '20',
};

// Anchored to the end and requires one of the final words, so ordinary titles
// like 'The Game' or 'Cut the Rope' keep their last word.
const EDITION_TAIL = /\s+(?:(?:the\s+)?(?:game\s+of\s+the\s+year|goty|definitive|complete|digital\s+deluxe|deluxe|ultimate|enhanced|special|anniversary|legendary|gold|premium|standard|royal|directors?\s+cut|remastered|redux)\s*)?(?:edition|collection|remastered|remaster|redux|goty|cut)$/;

// These are separate apps in the search results, so they are penalised rather
// than stripped - stripping would make a demo compare equal to the game itself.
const NOISE_WORDS = /\b(?:demo|beta|playtest|prologue|soundtrack|ost|dlc|season\s+pass|dedicated\s+server|server|sdk|benchmark|editor|artbook|art\s+book|trailer)\b/;

const SCORE_EXACT = 100;
const SCORE_CORE = 90;
const SCORE_CONTAINS = 70;
const NOISE_PENALTY = 40;
const ACCEPT_SCORE = 70;

function NormalizeName(raw: string): NormalizedName {
	let s = String(raw ?? '');

	s = s.split('&amp;').join('&').split('&#39;').join("'").split('&quot;').join('"');

	// Before NFKD on purpose: NFKD turns the trademark sign into the letters 'TM'.
	s = s.replace(/[™®©℠]/g, '');
	s = s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase();

	// Deleted, not replaced by a space, so "Sid Meier's" does not grow a stray 's'.
	s = s.replace(/['’ʼ´`]/g, '');
	s = s.replace(/(\d),(?=\d{3}\b)/g, '$1');
	s = s.replace(/&/g, ' and ');
	s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

	const tokens = s === '' ? [] : s.split(' ').map((token) => ROMAN_NUMERALS[token] ?? token);

	const full = tokens.join(' ');
	const core = full.replace(EDITION_TAIL, '').trim() || full;

	return {
		full,
		core,
		core_tokens: core === '' ? [] : core.split(' '),
		numbers: tokens
			.filter((token) => /^\d+$/.test(token))
			.map((token) => String(Number(token)))
			.join('.'),
		noisy: NOISE_WORDS.test(full),
	};
}

function IsTokenPrefix(short_tokens: string[], long_tokens: string[]): boolean {
	if (short_tokens.length === 0 || short_tokens.length >= long_tokens.length) return false;

	return short_tokens.every((token, index) => token === long_tokens[index]);
}

function ScoreCandidate(query: NormalizedName, candidate: NormalizedName): number {
	// The sequel guard. 'Sniper Ghost Warrior 2' is one character away from part 3,
	// so no similarity measure may reach across a different number sequence.
	if (query.numbers !== candidate.numbers) return -1;

	let score: number;

	if (query.full === candidate.full) {
		score = SCORE_EXACT;
	} else if (query.core === candidate.core) {
		score = SCORE_CORE;
	} else if (IsTokenPrefix(query.core_tokens, candidate.core_tokens) || IsTokenPrefix(candidate.core_tokens, query.core_tokens)) {
		score = SCORE_CONTAINS;
	} else {
		return -1;
	}

	if (candidate.noisy && !query.noisy) score -= NOISE_PENALTY;

	return score;
}

// Returns the index of the closest entry, or -1 when nothing is close enough.
function PickBestSearchResult(game_name: string, results: SearchResult[]): number {
	const query = NormalizeName(game_name);

	let best_index = -1;
	let best_score = -1;
	let best_distance = Number.MAX_SAFE_INTEGER;

	for (let index = 0; index < results.length; index++) {
		const entry = results[index];
		if (!entry?.appid || typeof entry?.name !== 'string') continue;

		const candidate = NormalizeName(entry.name);
		const score = ScoreCandidate(query, candidate);
		if (score < ACCEPT_SCORE) continue;

		// Prefer the least embellished title of an equally good match.
		const distance = Math.abs(candidate.core_tokens.length - query.core_tokens.length);

		if (score > best_score || (score === best_score && distance < best_distance)) {
			best_index = index;
			best_score = score;
			best_distance = distance;
		}
	}

	return best_index;
}

//#endregion

//#region Cache

let game_id_cache: Record<string, string> = LoadGameIdCache();

// Buttons are rendered in bursts, so without this every button with %GAME_ID%
// would fire its own identical request and they would run one after another in
// the single-threaded backend, blocking everything else queued behind them.
const game_id_requests = new Map<string, Promise<string>>();

// Bumped when the cache is cleared, so a request that was already in flight at
// that moment cannot silently restore the entry the user just deleted.
let game_id_cache_generation = 0;

function LoadGameIdCache(): Record<string, string> {
	try {
		const stored = localStorage.getItem(GAME_ID_CACHE_STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function SaveGameIdCache() {
	try {
		localStorage.setItem(GAME_ID_CACHE_STORAGE_KEY, JSON.stringify(game_id_cache));
	} catch (error) {
		console.error('[Custom-buttons] failed to save game id cache', error);
	}
}

export function ClearGameIdCache() {
	game_id_cache = {};
	game_id_cache_generation++;
	game_id_requests.clear();

	try {
		localStorage.removeItem(GAME_ID_CACHE_STORAGE_KEY);
	} catch (error) {
		console.error('[Custom-buttons] failed to clear game id cache', error);
	}
}

function GetGameIdCacheKey(game_name: string) {
	return game_name.trim().toLowerCase();
}

//#endregion

//#region Search

// Never rejects: every failure is reported as an empty id, so the shared promise
// is safe for all the callers waiting on it.
async function RequestGameId(game_name: string, cache_key: string): Promise<string> {
	const generation = game_id_cache_generation;

	try {
		const body = await backend.get_url_data(STEAM_SEARCH_APPS_URL + encodeURIComponent(game_name));
		if (!body) return '';

		const search_result: unknown = JSON.parse(body);
		if (!Array.isArray(search_result) || search_result.length === 0) return '';

		// Steam orders by popularity, so the first entry is often a different game
		// of the same series. Fall back to it only when no name is close enough.
		const best_index = PickBestSearchResult(game_name, search_result);
		const game_id = (search_result[best_index >= 0 ? best_index : 0] as SearchResult)?.appid;

		if (!game_id) return '';

		if (generation === game_id_cache_generation) {
			game_id_cache[cache_key] = String(game_id);
			SaveGameIdCache();
		}

		return String(game_id);
	} catch (error) {
		console.error('[Custom-buttons] failed to request game id for ' + game_name, error);
		return '';
	}
}

function SearchGameId(game_name: string): Promise<string> {
	const cache_key = GetGameIdCacheKey(game_name);

	if (cache_key === '') return Promise.resolve('');
	if (game_id_cache[cache_key]) return Promise.resolve(game_id_cache[cache_key]);

	const in_flight = game_id_requests.get(cache_key);
	if (in_flight) return in_flight;

	const request = RequestGameId(game_name, cache_key).finally(() => {
		game_id_requests.delete(cache_key);
	});

	game_id_requests.set(cache_key, request);

	return request;
}

//#endregion

// Steam games carry their real app id. Non-Steam games only have a local shortcut
// id, so for them the id is looked up on Steam by the game's name.
function IsShortcut(game: AppOverview): boolean {
	try {
		return game.BIsModOrShortcut?.() ?? false;
	} catch {
		return false;
	}
}

// Returns the id right away when it is known without a request, undefined otherwise.
export function GetKnownGameId(game: AppOverview): string | undefined {
	if (!IsShortcut(game)) return String(game.appid);

	return game_id_cache[GetGameIdCacheKey(game.display_name)];
}

export async function GetGameId(game: AppOverview): Promise<string> {
	return GetKnownGameId(game) ?? SearchGameId(game.display_name);
}
