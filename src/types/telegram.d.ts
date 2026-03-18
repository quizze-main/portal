interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: TelegramUser;
        receiver?: TelegramUser;
        chat?: TelegramChat;
        chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
        chat_instance?: string;
        start_param?: string;
        can_send_after?: number;
        auth_date: number;
        hash: string;
    };
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: ThemeParams;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    isClosingConfirmationEnabled: boolean;
    BackButton: {
        isVisible: boolean;
        onClick(callback: () => void): void;
        offClick(callback: () => void): void;
        show(): void;
        hide(): void;
    };
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        setText(text: string): void;
        onClick(callback: () => void): void;
        offClick(callback: () => void): void;
        show(): void;
        hide(): void;
        enable(): void;
        disable(): void;
        showProgress(leaveActive?: boolean): void;
        hideProgress(): void;
        setParams(params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
        }): void;
    };
    HapticFeedback: {
        impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
        notificationOccurred(type: 'error' | 'success' | 'warning'): void;
        selectionChanged(): void;
    };
    CloudStorage: {
        setItem(key: string, value: string, callback?: (error: string | null, success?: boolean) => void): void;
        getItem(key: string, callback: (error: string | null, value?: string) => void): void;
        getItems(keys: string[], callback: (error: string | null, values?: { [key: string]: string }) => void): void;
        removeItem(key: string, callback?: (error: string | null, success?: boolean) => void): void;
        removeItems(keys: string[], callback?: (error: string | null, success?: boolean) => void): void;
        getKeys(callback: (error: string | null, keys?: string[]) => void): void;
    };
    onEvent(eventType: 'themeChanged' | 'viewportChanged' | 'mainButtonClicked', eventHandler: () => void): void;
    offEvent(eventType: 'themeChanged' | 'viewportChanged' | 'mainButtonClicked', eventHandler: () => void): void;
    sendData(data: string): void;
    openLink(url: string, options?: { try_instant_view?: boolean }): void;
    openTelegramLink(url: string): void;
    openInvoice(url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void;
    showPopup(params: {
        title?: string;
        message: string;
        buttons?: { id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }[];
    }, callback?: (id?: string) => void): void;
    showAlert(message: string, callback?: () => void): void;
    showConfirm(message: string, callback?: (ok: boolean) => void): void;
    showScanQrPopup(params: { text?: string }, callback?: (text: string) => void): void;
    closeScanQrPopup(): void;
    readTextFromClipboard(callback?: (text: string | null) => void): void;
    ready(): void;
    expand(): void;
    close(): void;
    /**
     * Disables vertical swipe gestures that collapse/expand the mini app.
     * Available in Telegram Web Apps since 6.9+.
     */
    disableVerticalSwipes?: () => void;
    /**
     * Re-enables vertical swipe gestures if previously disabled.
     */
    enableVerticalSwipes?: () => void;
}

interface Window {
    Telegram: {
        WebApp: TelegramWebApp;
    };
}

interface TelegramUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title: string;
    username?: string;
    photo_url?: string;
}

interface ThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
}

export {};
