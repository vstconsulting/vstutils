from libc.stdio cimport FILE, fopen, fread, fwrite, fflush, fclose, fseek, ftell, rewind, SEEK_END
from libc.stdlib cimport malloc, free


def multikeysort(items, columns, reverse=False):
    if not isinstance(items, list):
        items = list(items)
    if not isinstance(columns, list):
        columns = list(columns)
    columns.reverse()

    for column in columns:
        # pylint: disable=cell-var-from-loop
        is_reverse = column.startswith('-')
        if is_reverse:
            column = column[1:]
        items.sort(key=lambda row: row[column], reverse=is_reverse)

    if reverse:
        items.reverse()

    return items


def get_file_value(filename, default='', raise_error=False, strip=True):
    result = default

    try:
        result = File(filename.encode('utf-8')).read().decode('utf-8')
        if strip:
            result = result.strip()
    except IOError:
        if raise_error:
            raise

    return result


cdef class File:
    cdef FILE* file
    cdef char* buff
    cdef long int _size
    cdef const char* filename
    cdef const char* mode

    def __cinit__(self, const char* filename, const char* mode = 'r'):
        self.filename = filename
        self.mode = mode
        self.file = self._open()

    cdef allowed(self):
        if not self.file == NULL:
            return True

    cdef FILE*_open(self):
        return fopen(self.filename, self.mode)

    cdef long int size(self):
        if not self.allowed():
            raise IOError('File is not found.')
        with nogil:
            if not self._size:
                fseek(self.file, 0, SEEK_END)
                self._size = ftell(self.file) + sizeof(char)
                rewind(self.file)
            return self._size - 1

    cdef _read(self):
        if not self.allowed():
            raise IOError('File is not found.')

        cdef long int size, typesize

        size = self.size()
        typesize = sizeof(char)

        with nogil:
            if self.buff == NULL:
                self.buff = <char*> malloc(size * typesize)
                if self.buff == NULL:
                    raise MemoryError('low memory')
                read = fread(self.buff, typesize, size, self.file)

        return self.buff[:size]

    def read(self):
        return self._read()

    cdef void _write(self, const char* value):
        if self.mode == b'r':
            raise IOError('File should opened for writing')
        if not self.allowed():
            raise IOError('File is not found.')

        size = len(value)
        typesize = sizeof(char)
        with nogil:
            fwrite(value, typesize, size, self.file)

    def write(self, value):
        self._write(value)

    cdef int _flush(self):
        return fflush(self.file)

    def flush(self):
        return self._flush()

    def __len__(self):
        return self.size()

    def __dealloc__(self):
        with nogil:
            if self.buff is not NULL:
                free(self.buff)
        self.close()

    cdef void close(self):
        with nogil:
            if self.file is not NULL:
                fclose(self.file)
