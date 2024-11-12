use pyo3::prelude::*;
use pyo3::wrap_pyfunction;
use base64::{engine::general_purpose, Engine as _};

/// Encode string by Vigenère cipher.
///
/// # Arguments
///
/// * `key` - Secret key for encoding.
/// * `clear` - Clear value for encoding.
///
/// # Returns
///
/// * Encoded string.
#[pyfunction]
fn encode(key: &str, clear: &str) -> PyResult<String> {
    let mut enc = Vec::with_capacity(clear.len());
    for (i, &clear_c) in clear.as_bytes().iter().enumerate() {
        let key_c = key.as_bytes()[i % key.len()];
        enc.push(((clear_c as u16 + key_c as u16) % 256) as u8);
    }
    let encoded = general_purpose::URL_SAFE.encode(&enc);
    Ok(encoded)
}

/// Decode string from encoded by Vigenère cipher.
///
/// # Arguments
///
/// * `key` - Secret key for decoding.
/// * `enc` - Encoded string for decoding.
///
/// # Returns
///
/// * Decoded string.
#[pyfunction]
fn decode(key: &str, enc: &str) -> PyResult<String> {
    let enc_bytes = general_purpose::URL_SAFE.decode(enc)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    let mut dec = Vec::with_capacity(enc_bytes.len());
    for (i, &enc_c) in enc_bytes.iter().enumerate() {
        let key_c = key.as_bytes()[i % key.len()];
        dec.push(((256 + enc_c as u16 - key_c as u16) % 256) as u8);
    }
    let decoded = String::from_utf8(dec)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    Ok(decoded)
}

/// Define the Python module.
#[pymodule]
fn _utils(_py: Python, m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(encode, m)?)?;
    m.add_function(wrap_pyfunction!(decode, m)?)?;
    Ok(())
}
