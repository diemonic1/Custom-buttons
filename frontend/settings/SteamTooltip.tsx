import { findModuleExport } from 'millennium';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

type SteamTooltipProps = {
	toolTipContent: ReactNode;
	direction?: 'top' | 'bottom' | 'left' | 'right';
	bPortalToBody?: boolean;
	style?: CSSProperties;
	children?: ReactNode;
};

// Steam's own tooltip wrapper (the one behind every "tool-tip-source" element).
// The Millennium API does not export it, so it is looked up on first use.
let steam_tooltip: ComponentType<SteamTooltipProps> | null | undefined;

function GetSteamTooltip() {
	if (steam_tooltip === undefined) {
		steam_tooltip =
			findModuleExport((item) => {
				if (typeof item !== 'function') return false;
				const source = item.toString();
				return source.includes('className:"tool-tip-source"') && source.includes('toolTipContent:') && !source.includes('cloneElement');
			}) ?? null;
	}

	return steam_tooltip;
}

// The tooltip is portalled to the body, so the narrow settings sidebar does not clip it.
export function SteamTooltip({ text, children, style }: { text: ReactNode; children: ReactNode; style?: CSSProperties }) {
	const Tooltip = GetSteamTooltip();

	if (!Tooltip) {
		return (
			<span title={typeof text === 'string' ? text : undefined} style={style}>
				{children}
			</span>
		);
	}

	return (
		<Tooltip toolTipContent={<div style={{ whiteSpace: 'pre-line', maxWidth: '420px' }}>{text}</div>} direction="bottom" bPortalToBody={true} style={style}>
			{children}
		</Tooltip>
	);
}
