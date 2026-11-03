// React 18 UMD with htm for templates, as Gravenhold did (D12). Both are globals loaded by the page.
export const { useState, useEffect, useRef, useMemo, useCallback } = window.React;
export const html = window.htm.bind(window.React.createElement);
