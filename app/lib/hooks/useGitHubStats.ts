import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { GitHubConnection, GitHubStats } from '~/types/GitHub';
import { gitHubApiService } from '~/lib/services/githubApiService';
import {
  fetchGitHubStatsViaAPI,
  githubConnection,
  initializeGitHubConnection,
  isFetchingStats,
  updateGitHubConnection,
} from '~/lib/stores/github';

interface UseGitHubStatsOptions {
  autoFetch?: boolean;
  cacheTimeout?: number;
}

interface UseGitHubStatsReturn {
  stats: GitHubStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isStale: boolean;
  refreshStats: () => Promise<void>;
}

const DEFAULT_CACHE_TIMEOUT = 30 * 60 * 1000;

export function useGitHubStats(
  connection: GitHubConnection | null,
  options: UseGitHubStatsOptions = {},
  forceServerSide: boolean = false,
): UseGitHubStatsReturn {
  const storeConnection = useStore(githubConnection);
  const fetchingStats = useStore(isFetchingStats);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const activeConnection = connection || storeConnection;
  const stats = activeConnection?.stats || null;
  const cacheTimeout = options.cacheTimeout ?? DEFAULT_CACHE_TIMEOUT;

  const isStale = useMemo(() => {
    if (!stats?.lastUpdated) {
      return true;
    }

    return Date.now() - new Date(stats.lastUpdated).getTime() > cacheTimeout;
  }, [cacheTimeout, stats?.lastUpdated]);

  const refreshStats = useCallback(async () => {
    if (!activeConnection) {
      setError('No GitHub connection available');
      return;
    }

    setError(null);

    try {
      if (activeConnection.token && !forceServerSide) {
        const freshStats = await gitHubApiService.fetchStats(activeConnection.token, activeConnection.tokenType);
        updateGitHubConnection({ ...activeConnection, stats: freshStats });
      } else {
        await fetchGitHubStatsViaAPI();
      }

      setHasLoaded(true);
    } catch (refreshError) {
      console.error('Failed to fetch GitHub stats:', refreshError);
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to fetch GitHub stats');
    }
  }, [activeConnection, forceServerSide]);

  useEffect(() => {
    const shouldAutoFetch = options.autoFetch !== false;

    if (!shouldAutoFetch) {
      return;
    }

    let cancelled = false;

    const loadStats = async () => {
      try {
        if (!activeConnection?.user) {
          await initializeGitHubConnection();
        }

        const latestConnection = githubConnection.get();

        if (cancelled || !latestConnection?.user) {
          return;
        }

        const latestStats = latestConnection.stats;
        const needsRefresh = !latestStats?.lastUpdated || Date.now() - new Date(latestStats.lastUpdated).getTime() > cacheTimeout;

        if (needsRefresh) {
          await refreshStats();
        } else {
          setHasLoaded(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to initialize GitHub stats:', loadError);
          setError(loadError instanceof Error ? loadError.message : 'Failed to initialize GitHub stats');
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [activeConnection?.user, cacheTimeout, options.autoFetch, refreshStats]);

  return {
    stats,
    isLoading: !hasLoaded && fetchingStats,
    isRefreshing: fetchingStats,
    error,
    isStale,
    refreshStats,
  };
}