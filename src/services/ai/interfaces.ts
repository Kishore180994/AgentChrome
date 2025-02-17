/**
 * Represents the role of an entity in the system.
 *
 * @typedef {("model" | "user")} Role
 *
 * @property {"model"} model - Represents the AI model role.
 * @property {"user"} user - Represents the user role.
 */
export type Role = "model" | "user";

/**
 * Represents a chat message in the system.
 */
export interface ChatMessage {
  role: Role;
  parts: Array<Parts>;
}

/**
 * Represents the data of a file.
 */
export interface FileData {
  mimeType: string;
  fileUri: string;
}

/**
 * Represents the parts of a data structure that can include file data and text.
 */
export interface Parts {
  fileData?: FileData;
  text?: string;
}

/**
 * Represents an element on a web page.
 */
export interface PageElement {
  /**
   * The index of the element in the DOM.
   */
  index: number;

  /**
   * The tag name of the element (e.g., 'div', 'span').
   */
  tagName: string;

  /**
   * The CSS selector for the element.
   */
  selector: string;

  /**
   * The text content of the element.
   */
  text: string;

  /**
   * The full text content of the element, including its descendants.
   */
  fullText: string;

  /**
   * A record of the element's attributes and their values.
   */
  attributes: Record<string, string | null>;

  /**
   * The ARIA role of the element, if any.
   */
  role?: string;

  /**
   * The accessible label of the element, if any.
   */
  accessibleLabel?: string;

  /**
   * The bounding box of the element, containing its position and dimensions.
   */
  boundingBox: {
    /**
     * The x-coordinate of the top-left corner of the bounding box.
     */
    x: number;

    /**
     * The y-coordinate of the top-left corner of the bounding box.
     */
    y: number;

    /**
     * The width of the bounding box.
     */
    width: number;

    /**
     * The height of the bounding box.
     */
    height: number;
  };
}
