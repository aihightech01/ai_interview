package com.example.demo.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.web.multipart.MultipartFile;
import org.apache.tika.Tika;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class FileParseUtil {

    private static final Tika tika = new Tika();

    public static String parseFile(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            return "";
        }

        String mimeType = tika.detect(file.getInputStream());

        try (InputStream input = file.getInputStream()) {
            if ("application/pdf".equals(mimeType)) {
                return parsePdfWithPDFBox(input);
            } else if ("text/plain".equals(mimeType)) {
                return parseTxt(input);
            } else {
                // 기타 파일은 Tika 기본 방식으로 처리하거나 빈 문자열 반환
                return "";
            }
        }
    }

    private static String parsePdfWithPDFBox(InputStream input) throws Exception {
        try (PDDocument document = PDDocument.load(input)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private static String parseTxt(InputStream input) throws Exception {
        byte[] bytes = input.readAllBytes();
        return new String(bytes, StandardCharsets.UTF_8);
    }
}