/**
 * @module Crypto Module for encryption and decryption of data.
 */

class Crypto {
  // Constructor
  constructor(key = null) {
    // Set the encryption key (disabled for now)
    this.key = key;
  }
  static async generateKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Derive an AES-GCM key from the password
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("iris_salt"), // In a real scenario, use a random salt
        iterations: 1000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(data, password = "hardcoded_password") {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Generamos un IV aleatorio
    const key = await this.generateKey(password);

    // Encrypt the data
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encoder.encode(JSON.stringify(data))
    );

    // Return the IV and the encrypted data
    return {
      iv: Array.from(iv), // Convertimos a un formato serializable
      data: Array.from(new Uint8Array(encrypted)),
    };
  }

  static async decrypt(encryptedObject, password = "hardcoded_password") {
    const { iv, data } = encryptedObject;
    const key = await this.generateKey(password);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      key,
      new Uint8Array(data)
    );

    // Return the decrypted data as an JSON object
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}

export { Crypto };