import { Plugin, MarkdownView, Editor } from 'obsidian';

// ========================================
// 型定義
// ========================================

/** ポップアップの配置位置 */
type PopupPlacement = 'top' | 'bottom';

/** ポップアップの位置情報 */
interface PopupPosition {
    top: number;
    left: number;
    placement: PopupPlacement;
}


// ========================================
// 定数設定
// ========================================

/** ポップアップ表示の設定定数 */
class PopupConfig {
    /** 吹き出しの尻尾サイズ（CSSと一致させる） */
    static readonly TAIL_SIZE = 6;

    /** 選択テキストとポップアップの間のマージン */
    static readonly POPUP_MARGIN = 10;

    /** 合計オフセット：尻尾 + マージン */
    static readonly TOTAL_OFFSET = this.TAIL_SIZE + this.POPUP_MARGIN;

    /** 画面端からのマージン */
    static readonly SCREEN_MARGIN = 10;

    /** 選択チェックの遅延時間（ミリ秒） */
    static readonly SELECTION_CHECK_DELAY = 50;

    /** デバッグモード */
    static readonly DEBUG = false;

    /** ポップアップのCSSクラス名 */
    static readonly POPUP_CLASS = 'text-selection-linker-popup';
    static readonly BUTTON_CLASS = 'text-selection-linker-button';
    static readonly SHOW_CLASS = 'show';
    static readonly PLACEMENT_TOP_CLASS = 'popup-top';
    static readonly PLACEMENT_BOTTOM_CLASS = 'popup-bottom';
}

// ========================================
// ポップアップ管理
// ========================================

/**
 * ポップアップUIの生成・表示・非表示を管理
 */
class PopupManager {
    private popup: HTMLElement | null = null;

    /**
     * ポップアップ要素を作成
     * @param onConvert リンク変換時のコールバック
     */
    create(onConvert: () => void): HTMLElement {
        const popup = document.createElement('div');
        popup.className = PopupConfig.POPUP_CLASS;

        const linkButton = this.createLinkButton(onConvert);
        popup.appendChild(linkButton);

        this.popup = popup;
        return popup;
    }

    /**
     * リンクボタンを作成
     */
    private createLinkButton(onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = PopupConfig.BUTTON_CLASS;
        button.innerHTML = '[[Link]]';
        button.title = 'Convert to internal link';
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * ポップアップを表示（アニメーション付き）
     */
    show(): void {
        if (!this.popup) return;

        document.body.appendChild(this.popup);

        // 次のフレームでshowクラスを追加してアニメーション
        requestAnimationFrame(() => {
            this.popup?.classList.add(PopupConfig.SHOW_CLASS);
        });
    }

    /**
     * ポップアップを非表示
     */
    hide(): void {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }

    /**
     * ポップアップの位置を設定
     */
    position(position: PopupPosition): void {
        if (!this.popup) return;

        // 配置クラスを設定（尻尾の向きを変える）
        this.popup.classList.remove(
            PopupConfig.PLACEMENT_TOP_CLASS,
            PopupConfig.PLACEMENT_BOTTOM_CLASS
        );
        this.popup.classList.add(`popup-${position.placement}`);

        this.popup.style.top = `${position.top}px`;
        this.popup.style.left = `${position.left}px`;
    }

    /**
     * ポップアップ要素を取得
     */
    getElement(): HTMLElement | null {
        return this.popup;
    }

    /**
     * ポップアップが存在するか
     */
    exists(): boolean {
        return this.popup !== null;
    }
}

// ========================================
// 位置計算
// ========================================

/**
 * ポップアップの最適な位置を計算（デフォルト：選択範囲の上）
 */
class PositionCalculator {
    /**
     * 選択テキストと重ならない位置を計算
     */
    static calculate(selectionRect: DOMRect, popupRect: DOMRect): PopupPosition {
        const left = this.calculateHorizontalPosition(selectionRect, popupRect);
        const { top, placement } = this.calculateVerticalPosition(selectionRect, popupRect);

        // デバッグ情報
        if (PopupConfig.DEBUG) {
            this.logPositionDebug(selectionRect, popupRect, { top, left, placement });
        }

        // 最終的な衝突チェック
        if (this.hasCollision(selectionRect, { top, left, placement }, popupRect)) {
            console.warn('⚠️ Collision detected! Forcing safe position.');
            return this.forceSafePosition(selectionRect, popupRect);
        }

        return { top, left, placement };
    }

    /**
     * 水平方向の位置を計算（画面端を考慮）
     */
    private static calculateHorizontalPosition(
        selectionRect: DOMRect,
        popupRect: DOMRect
    ): number {
        // 選択テキストの中央にポップアップの中央を合わせる
        const centerAligned = selectionRect.left + (selectionRect.width / 2) - (popupRect.width / 2);

        // 画面端からはみ出さないように調整
        return this.clampToHorizontalBounds(centerAligned, popupRect.width);
    }

    /**
     * 垂直方向の位置を計算（デフォルト：選択範囲の上）
     */
    private static calculateVerticalPosition(
        selectionRect: DOMRect,
        popupRect: DOMRect
    ): { top: number; placement: PopupPlacement } {
        const viewportHeight = window.innerHeight;
        const selectionTop = selectionRect.top;
        const selectionBottom = selectionRect.bottom;

        // 優先順位1：選択範囲の上に配置（デフォルト）
        const topPlacement = selectionTop - popupRect.height - PopupConfig.TOTAL_OFFSET;

        if (topPlacement >= PopupConfig.SCREEN_MARGIN) {
            // 上に配置可能
            return {
                top: topPlacement,
                placement: 'top'
            };
        }

        // 優先順位2：選択範囲の下に配置
        const bottomPlacement = selectionBottom + PopupConfig.TOTAL_OFFSET;
        const popupBottom = bottomPlacement + popupRect.height;

        if (popupBottom <= viewportHeight - PopupConfig.SCREEN_MARGIN) {
            // 下に配置可能
            return {
                top: bottomPlacement,
                placement: 'bottom'
            };
        }

        // どちらも不可能な場合：広い方のスペースに配置
        const spaceAbove = selectionTop - PopupConfig.SCREEN_MARGIN;
        const spaceBelow = viewportHeight - selectionBottom - PopupConfig.SCREEN_MARGIN;

        if (spaceAbove >= spaceBelow) {
            // 上のスペースの方が広い
            return {
                top: Math.max(PopupConfig.SCREEN_MARGIN, topPlacement),
                placement: 'top'
            };
        } else {
            // 下のスペースの方が広い
            return {
                top: Math.min(
                    viewportHeight - popupRect.height - PopupConfig.SCREEN_MARGIN,
                    bottomPlacement
                ),
                placement: 'bottom'
            };
        }
    }

    /**
     * 水平方向の境界内に収める
     */
    private static clampToHorizontalBounds(left: number, popupWidth: number): number {
        const minLeft = PopupConfig.SCREEN_MARGIN;
        const maxLeft = window.innerWidth - popupWidth - PopupConfig.SCREEN_MARGIN;

        return Math.max(minLeft, Math.min(left, maxLeft));
    }

    /**
     * 衝突チェック（ポップアップと選択範囲が重なっているか）
     */
    private static hasCollision(
        selectionRect: DOMRect,
        position: PopupPosition,
        popupRect: DOMRect
    ): boolean {
        const popupTop = position.top;
        const popupBottom = position.top + popupRect.height;
        const popupLeft = position.left;
        const popupRight = position.left + popupRect.width;

        const selectionTop = selectionRect.top;
        const selectionBottom = selectionRect.bottom;
        const selectionLeft = selectionRect.left;
        const selectionRight = selectionRect.right;

        // 垂直方向の重なりチェック
        const verticalOverlap = !(popupBottom < selectionTop || popupTop > selectionBottom);

        // 水平方向の重なりチェック
        const horizontalOverlap = !(popupRight < selectionLeft || popupLeft > selectionRight);

        return verticalOverlap && horizontalOverlap;
    }

    /**
     * 安全な位置を強制的に計算（衝突が検出された場合）
     */
    private static forceSafePosition(
        selectionRect: DOMRect,
        popupRect: DOMRect
    ): PopupPosition {
        const viewportHeight = window.innerHeight;

        // 選択範囲の上に強制配置
        let top = selectionRect.top - popupRect.height - PopupConfig.TOTAL_OFFSET;
        let placement: PopupPlacement = 'top';

        // 画面上端を超える場合は下に配置
        if (top < PopupConfig.SCREEN_MARGIN) {
            top = selectionRect.bottom + PopupConfig.TOTAL_OFFSET;
            placement = 'bottom';

            // それでも画面下端を超える場合
            if (top + popupRect.height > viewportHeight - PopupConfig.SCREEN_MARGIN) {
                top = Math.max(
                    PopupConfig.SCREEN_MARGIN,
                    viewportHeight - popupRect.height - PopupConfig.SCREEN_MARGIN
                );
            }
        }

        const left = this.calculateHorizontalPosition(selectionRect, popupRect);

        return { top, left, placement };
    }

    /**
     * デバッグ情報をログ出力
     */
    private static logPositionDebug(
        selectionRect: DOMRect,
        popupRect: DOMRect,
        position: PopupPosition
    ): void {
        console.group('🔍 Position Debug');
        console.log('Selection:', {
            top: selectionRect.top,
            bottom: selectionRect.bottom,
            left: selectionRect.left,
            right: selectionRect.right,
            height: selectionRect.height,
            width: selectionRect.width
        });
        console.log('Popup:', {
            top: position.top,
            bottom: position.top + popupRect.height,
            left: position.left,
            right: position.left + popupRect.width,
            height: popupRect.height,
            width: popupRect.width
        });
        console.log('Gap:', {
            vertical: position.top - selectionRect.bottom,
            margin: PopupConfig.POPUP_MARGIN
        });
        console.groupEnd();
    }
}

// ========================================
// 選択テキスト処理
// ========================================

/**
 * テキスト選択とリンク変換を処理
 */
class SelectionHandler {
    private editor: Editor | null = null;

    /**
     * エディターを設定
     */
    setEditor(editor: Editor): void {
        this.editor = editor;
    }

    /**
     * 選択中のテキストを取得
     */
    getSelectedText(): string {
        return this.editor?.getSelection() || '';
    }

    /**
     * 選択テキストが有効か（空白以外の文字がある）
     */
    hasValidSelection(): boolean {
        return this.getSelectedText().trim().length > 0;
    }

    /**
     * 選択テキストを強制的に [[...]] に変換
     *
     * 目的：選択範囲を常にダブルブラケットで囲む
     * 手段：既存のブラケットを全て削除してから [[...]] で囲む
     *
     * 例：
     * - [[text]] → [[text]] （再適用）
     * - [text] → [[text]]
     * - これは[text]です → [[これはtextです]]
     * - [[text]] は文脈を読まないと意味がない → [[text は文脈を読まないと意味がない]]
     * - text → [[text]]
     */
    convertToLink(): void {
        if (!this.editor) return;

        let selectedText = this.getSelectedText();
        if (!selectedText) return;

        // ステップ1：全てのブラケットを削除（ネスト対応）
        // [[ と ]] を全て削除
        selectedText = selectedText.replace(/\[\[/g, '').replace(/\]\]/g, '');

        // 残った [ と ] も全て削除
        selectedText = selectedText.replace(/\[/g, '').replace(/\]/g, '');

        // ステップ2：ダブルブラケットで囲む
        const linkedText = `[[${selectedText}]]`;
        this.editor.replaceSelection(linkedText);
    }

    /**
     * 選択範囲の矩形を取得
     */
    getSelectionRect(): DOMRect | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);
        return range.getBoundingClientRect();
    }
}

// ========================================
// メインプラグイン
// ========================================

/**
 * Obsidian Text Selection Linker Plugin
 * 選択したテキストを内部リンク[[]]に変換するポップアップを表示
 */
export default class TextSelectionLinkerPlugin extends Plugin {
    private popupManager = new PopupManager();
    private selectionHandler = new SelectionHandler();
    private isProcessing = false;

    async onload(): Promise<void> {
        console.log('Loading Text Selection Linker Plugin');

        this.registerEventHandlers();
    }

    onunload(): void {
        console.log('Unloading Text Selection Linker Plugin');
        this.popupManager.hide();
    }

    /**
     * イベントハンドラーを登録
     */
    private registerEventHandlers(): void {
        // マウスアップイベント（選択完了）
        this.registerDomEvent(document, 'mouseup', this.handleMouseUp.bind(this));

        // キーボードイベント（Shift+Arrow選択、Escキー）
        this.registerDomEvent(document, 'keyup', this.handleKeyUp.bind(this));

        // 選択変更イベント（選択解除を検知）
        this.registerDomEvent(document, 'selectionchange', this.handleSelectionChange.bind(this));

        // スクロール・リサイズ時の再配置
        this.registerDomEvent(window, 'scroll', this.handleScrollOrResize.bind(this), true);
        this.registerDomEvent(window, 'resize', this.handleScrollOrResize.bind(this));

        // エディター変更時のクリーンアップ
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.popupManager.hide();
            })
        );
    }

    /**
     * スクロール・リサイズイベント処理
     */
    private handleScrollOrResize(): void {
        if (this.popupManager.exists()) {
            // ポップアップが表示中なら再配置
            this.updatePopupPosition();
        }
    }

    /**
     * ポップアップ位置を更新
     */
    private updatePopupPosition(): void {
        const selectionRect = this.selectionHandler.getSelectionRect();
        const popupElement = this.popupManager.getElement();

        if (!selectionRect || !popupElement) {
            // 選択が無効になった場合は非表示
            this.popupManager.hide();
            return;
        }

        const popupRect = popupElement.getBoundingClientRect();
        const position = PositionCalculator.calculate(selectionRect, popupRect);

        this.popupManager.position(position);
    }

    /**
     * マウスアップイベント処理
     */
    private handleMouseUp(): void {
        setTimeout(() => {
            this.checkSelection();
        }, PopupConfig.SELECTION_CHECK_DELAY);
    }

    /**
     * キーボードイベント処理
     */
    private handleKeyUp(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.popupManager.hide();
            return;
        }

        const isShiftArrowKey = event.shiftKey &&
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);

        if (isShiftArrowKey) {
            setTimeout(() => {
                this.checkSelection();
            }, PopupConfig.SELECTION_CHECK_DELAY);
        }
    }

    /**
     * 選択変更イベント処理（選択解除を即座に検知）
     */
    private handleSelectionChange(): void {
        // ポップアップが表示中かつ選択が無効になった場合は非表示
        if (this.popupManager.exists() && !this.selectionHandler.hasValidSelection()) {
            this.popupManager.hide();
        }
    }

    /**
     * 選択状態をチェックしてポップアップ表示を判定
     */
    private checkSelection(): void {
        if (this.isProcessing) return;

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView?.editor) {
            this.popupManager.hide();
            return;
        }

        this.selectionHandler.setEditor(activeView.editor);

        if (this.selectionHandler.hasValidSelection()) {
            this.showPopup();
        } else {
            this.popupManager.hide();
        }
    }

    /**
     * ポップアップを表示
     */
    private showPopup(): void {
        this.isProcessing = true;
        this.popupManager.hide();

        // ポップアップ作成
        this.popupManager.create(() => {
            this.handleConvertToLink();
        });

        // 表示
        this.popupManager.show();

        // 位置計算（次のフレームでDOMが反映された後）
        requestAnimationFrame(() => {
            this.positionPopup();
            this.isProcessing = false;
        });
    }

    /**
     * ポップアップの位置を設定
     */
    private positionPopup(): void {
        const selectionRect = this.selectionHandler.getSelectionRect();
        const popupElement = this.popupManager.getElement();

        if (!selectionRect || !popupElement) return;

        const popupRect = popupElement.getBoundingClientRect();
        const position = PositionCalculator.calculate(selectionRect, popupRect);

        this.popupManager.position(position);
    }

    /**
     * リンク変換処理
     */
    private handleConvertToLink(): void {
        this.selectionHandler.convertToLink();
        this.popupManager.hide();
    }
}
