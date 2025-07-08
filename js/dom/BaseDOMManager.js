import { Utils } from '../utils/Utils.js';

/**
 * Base DOM Manager with common functionality
 */
export class BaseDOMManager {
    constructor() {
        this.elements = {};
    }

    /**
     * Initialize DOM elements by their IDs
     * @param {Array<string>} elementIds - Array of element IDs to cache
     */
    initializeElements(elementIds) {
        return elementIds.reduce((acc, id) => {
            const element = document.getElementById(id);
            if (element) {
                acc[id.replace(/-/g, '_')] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
            return acc;
        }, {});
    }

    /**
     * Set button disabled state
     * @param {string} buttonName - Button element key
     * @param {boolean} disabled - Disabled state
     */
    setButtonState(buttonName, disabled) {
        const button = this.elements[buttonName];
        if (button) button.disabled = disabled;
    }

    /**
     * Show/hide elements
     * @param {string} elementName - Element key
     * @param {boolean} show - Whether to show the element
     */
    toggleElement(elementName, show) {
        const element = this.elements[elementName];
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Set text content of an element
     * @param {string} elementName - Element key
     * @param {string} text - Text to set
     */
    setText(elementName, text) {
        const element = this.elements[elementName];
        if (element) element.textContent = text;
    }
}
