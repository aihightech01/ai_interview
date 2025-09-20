package com.example.interviewaiserver.util;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

public class FileParseUtil {

    private static final Tika tika = new Tika();

    public static String parseFile(MultipartFile file) throws IOException, TikaException {
        if (file == null || file.isEmpty()) {
            return "";
        }
        try (InputStream stream = file.getInputStream()) {
            return tika.parseToString(stream);
        }
    }
}