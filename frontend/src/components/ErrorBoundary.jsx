import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { useT } from '../i18n/useT';

// A deploy replaces the old code files, so a page opened before it can fail to
// load the next screen. That is "please reload", not a real fault.
const STALE_BUILD = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i;

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed, caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) return <ErrorScreen error={this.state.error} />;
    return this.props.children;
  }
}

function ErrorScreen({ error }) {
  const t = useT();
  const message = String(error?.message || error || '');
  const staleBuild = STALE_BUILD.test(message);

  const reload = () => {
    if (staleBuild) {
      window.location.reload();
      return;
    }
    // A real error: clear saved state too, as this screen always has.
    localStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 font-sans text-fg">
      <div className="w-full max-w-md space-y-4 rounded-card border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">{staleBuild ? t('error.updateTitle') : t('error.title')}</h1>
        <p className="text-sm text-fg-muted">{staleBuild ? t('error.updateBody') : t('error.body')}</p>
        {!staleBuild && message && (
          <details className="rounded-control border border-line bg-sunken px-3 py-2 text-sm">
            <summary className="cursor-pointer text-fg-muted">{t('error.details')}</summary>
            <p className="mt-2 break-words font-mono text-xs text-danger">{message}</p>
          </details>
        )}
        <Button icon={RefreshCw} onClick={reload} fullWidth size="lg">
          {t('error.reload')}
        </Button>
      </div>
    </div>
  );
}
