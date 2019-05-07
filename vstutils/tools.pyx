from libc.stdio cimport FILE, fopen, fread, fclose, fseek, ftell, rewind, SEEK_END
from libc.stdlib cimport malloc, free


def get_file_value(filename, default='', raise_error=False):
    result = default

    try:
        result = File(filename.encode('utf-8')).read().decode('utf-8').strip()
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

    cdef read(self):
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
