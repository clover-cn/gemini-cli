/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import {
  AuthType,
  Config,
  clearCachedCredentialFile,
  getErrorMessage,
} from '@google/gemini-cli-core';

export const useAuthCommand = (
  settings: LoadedSettings,
  setAuthError: (error: string | null) => void,
  config: Config,
) => {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(
    settings.merged.selectedAuthType === undefined && !config.getCustomAPI()?.endpoint,
  );

  const openAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(true);
  }, []);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const authFlow = async () => {
      const authType = settings.merged.selectedAuthType;
      const customAPI = config.getCustomAPI();

      // If we have a custom API, initialize content generator without auth
      if (customAPI?.endpoint) {
        try {
          setIsAuthenticating(true);
          await config.refreshContentGenerator();
          console.log('Initialized custom API content generator.');
        } catch (e) {
          setAuthError(`Failed to initialize custom API. Message: ${getErrorMessage(e)}`);
        } finally {
          setIsAuthenticating(false);
        }
        return;
      }

      if (isAuthDialogOpen || !authType) {
        return;
      }

      // Handle custom API authentication
      if (authType === AuthType.CUSTOM_API) {
        try {
          setIsAuthenticating(true);
          await config.refreshContentGenerator();
          console.log('Authenticated via "custom-api".');
        } catch (e) {
          setAuthError(`Failed to initialize custom API. Message: ${getErrorMessage(e)}`);
          openAuthDialog();
        } finally {
          setIsAuthenticating(false);
        }
        return;
      }

      try {
        setIsAuthenticating(true);
        await config.refreshAuth(authType);
        console.log(`Authenticated via "${authType}".`);
      } catch (e) {
        setAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
        openAuthDialog();
      } finally {
        setIsAuthenticating(false);
      }
    };

    void authFlow();
  }, [isAuthDialogOpen, settings, config, setAuthError, openAuthDialog]);

  const handleAuthSelect = useCallback(
    async (authType: AuthType | undefined, scope: SettingScope) => {
      if (authType) {
        // Only clear cached credentials for non-custom API auth types
        if (authType !== AuthType.CUSTOM_API) {
          await clearCachedCredentialFile();
        }
        settings.setValue(scope, 'selectedAuthType', authType);
      }
      setIsAuthDialogOpen(false);
      setAuthError(null);
    },
    [settings, setAuthError],
  );

  const cancelAuthentication = useCallback(() => {
    setIsAuthenticating(false);
  }, []);

  return {
    isAuthDialogOpen,
    openAuthDialog,
    handleAuthSelect,
    isAuthenticating,
    cancelAuthentication,
  };
};
