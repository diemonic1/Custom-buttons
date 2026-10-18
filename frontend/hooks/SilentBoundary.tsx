import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children?: ReactNode };
type State = { failed: boolean };

// The plugin's buttons are rendered inside Steam's own UI, so an error in them
// must hide only the buttons instead of breaking the Steam window around them.
export class SilentBoundary extends Component<Props, State> {
	state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[Custom-buttons] failed to render buttons', error, info.componentStack);
	}

	render() {
		return this.state.failed ? null : this.props.children;
	}
}
