use pyo3::prelude::*;
use std::fs;
use std::path::Path;

#[pyfunction]
fn get_file_value(filename: &str, default: Option<&str>, raise_error: Option<bool>, strip: Option<bool>) -> PyResult<String> {
    let default = default.unwrap_or("");
    let raise_error = raise_error.unwrap_or(false);
    let strip = strip.unwrap_or(true);

    let content = fs::read_to_string(Path::new(filename));

    match content {
        Ok(mut text) => {
            if strip {
                text = text.trim().to_string();
            }
            Ok(text)
        }
        Err(e) => {
            if raise_error {
                Err(PyErr::new::<pyo3::exceptions::PyIOError, _>(e.to_string()))
            } else {
                Ok(default.to_string())
            }
        }
    }
}

/// A Python module implemented in Rust.
#[pymodule]
fn _tools(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(get_file_value, m)?)?;
    Ok(())
}
