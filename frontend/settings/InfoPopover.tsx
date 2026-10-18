import type { ReactNode } from 'react';
import { SettingsIcon } from './SettingsIcon';
import { SteamTooltip } from './SteamTooltip';

// An "i" icon that shows longer explanations in a Steam tooltip while it is hovered.
export function InfoPopover({ children }: { children: ReactNode }) {
	return (
		<SteamTooltip text={children} style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
			<SettingsIcon name="Information" size={20} />
		</SteamTooltip>
	);
}
