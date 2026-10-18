import { IconsModule } from 'millennium';

type Props = {
	name: string;
	size?: number;
	direction?: 'up' | 'down' | 'left' | 'right';
};

// An icon from Steam's icon set. It sits in a box of a fixed size: some of the
// icons (Chevron) replace their style prop with their own, so on their own they
// would shrink in a flex row next to a long label.
export function SettingsIcon({ name, size = 16, direction }: Props) {
	const Icon = IconsModule?.[name];
	if (!Icon) return null;

	return (
		<span style={{ display: 'inline-flex', width: size + 'px', height: size + 'px', minWidth: size + 'px', flexShrink: 0 }}>
			<Icon width="100%" height="100%" direction={direction} />
		</span>
	);
}
