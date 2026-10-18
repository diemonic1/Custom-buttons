import { useEffect, useState } from 'react';
import type { AppOverview, Flag } from '../types';
import { GetGameId, GetKnownGameId } from './gameId';

const GAME_NAME_PARAMETER = '%GAME_NAME%';
const GAME_ID_PARAMETER = '%GAME_ID%';

function FormatGameName(str: string) {
	str = str.replace(/([^A-Z])([A-Z]{2,})(?![A-Z])/g, '$1+$2');
	str = str.replace(/([^A-Z]|^)([A-Z])(?![A-Z])/g, '$1+$2');
	str = str.replace(/[\/\\]/g, '+');
	str = str.replace(/\s+/g, '+');
	str = str.replace(/^\+/, '').replace(/\+$/, '');
	str = str.replace(/\++/g, '+');
	return str.trim();
}

function ReplaceGameName(text: string, game: AppOverview, format_game_name: Flag) {
	return text.split(GAME_NAME_PARAMETER).join(format_game_name === 'true' ? FormatGameName(game.display_name) : game.display_name);
}

// Resolves the label without waiting: an id that still has to be requested from
// Steam is left empty and filled in once the request completes.
export function useButtonLabel(raw_name: string, game: AppOverview, format_game_name: Flag): string {
	const name = ReplaceGameName(raw_name, game, format_game_name);
	const needs_id = name.includes(GAME_ID_PARAMETER);
	const known_id = needs_id ? GetKnownGameId(game) : undefined;

	const [requested_id, setRequestedId] = useState<string>();

	useEffect(() => {
		if (!needs_id || known_id !== undefined) return undefined;

		let cancelled = false;
		GetGameId(game).then((game_id) => {
			if (!cancelled) setRequestedId(game_id);
		});

		return () => {
			cancelled = true;
		};
	}, [needs_id, known_id, game.appid, game.display_name]);

	return needs_id ? name.split(GAME_ID_PARAMETER).join(known_id ?? requested_id ?? '') : name;
}

async function ResolveButtonPath(raw_path: string, game: AppOverview | undefined, format_game_name: Flag) {
	if (!game) return raw_path;

	const path = ReplaceGameName(raw_path, game, format_game_name);
	if (!path.includes(GAME_ID_PARAMETER)) return path;

	return path.split(GAME_ID_PARAMETER).join(await GetGameId(game));
}

// Web pages open in the system browser, anything else (an app, a file, a folder)
// is opened by the backend the same way Explorer would open it.
export async function OpenButtonPath(raw_path: string, game?: AppOverview, format_game_name: Flag = 'false') {
	try {
		const path = await ResolveButtonPath(raw_path, game, format_game_name);

		if (path.includes('https://') || path.includes('http://')) {
			SteamClient.System.OpenInSystemBrowser(path);
		} else {
			await backend.run_command(path);
		}
	} catch (error) {
		console.error('[Custom-buttons] failed to open ' + raw_path, error);
	}
}
