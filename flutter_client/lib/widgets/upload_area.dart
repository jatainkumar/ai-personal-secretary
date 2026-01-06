import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/app_state.dart';
import 'vcf_enrichment_modal.dart';

class UploadArea extends ConsumerWidget {
  const UploadArea({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUploading = ref.watch(isUploadingProvider);
    final uploadStatus = ref.watch(uploadStatusProvider);

    Future<void> pickAndUpload() async {
      try {
        final result = await FilePicker.platform.pickFiles(
          allowMultiple: true,
          type: FileType.custom,
          allowedExtensions: ['csv', 'pdf', 'docx', 'txt', 'vcf'],
        );

        if (result != null) {
          final files = result.paths.map((path) => File(path!)).toList();
          final userId = ref.read(userIdProvider);

          if (userId == null) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('User ID not found. Please log in first.'),
                ),
              );
            }
            return;
          }

          // Check for VCF
          final vcfFiles = files
              .where((f) => f.path.toLowerCase().endsWith('.vcf'))
              .toList();
          if (vcfFiles.isNotEmpty) {
            ref.read(uploadStatusProvider.notifier).state = "Processing VCF...";
            try {
              final report = await ref
                  .read(apiRepositoryProvider)
                  .enrichFromVcf(vcfFiles, userId);
              ref.read(vcfMatchReportProvider.notifier).state = report;
              ref.read(vcfTempDirProvider.notifier).state = report['temp_dir'];

              // Show VCF Modal
              if (context.mounted) {
                showDialog(
                  context: context,
                  builder: (_) => const VcfEnrichmentModal(),
                );
              }
            } catch (e) {
              ref.read(uploadStatusProvider.notifier).state = "VCF Error: $e";
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error processing VCF: $e')),
                );
              }
            } finally {
              Future.delayed(const Duration(seconds: 3), () {
                if (context.mounted) {
                  ref.read(uploadStatusProvider.notifier).state = null;
                }
              });
            }
            return;
          }

          ref.read(isUploadingProvider.notifier).state = true;
          ref.read(uploadStatusProvider.notifier).state =
              "Uploading ${files.length} files...";

          try {
            final response = await ref
                .read(apiRepositoryProvider)
                .processDocuments(files, userId); // sending List<File>

            ref.read(statsProvider.notifier).state = response; // Update stats
            ref.read(uploadStatusProvider.notifier).state =
                "Upload successful!";
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Success! Loaded ${response.count} connections.',
                  ),
                ),
              );
            }
          } catch (e) {
            ref.read(uploadStatusProvider.notifier).state = "Error: $e";
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Error uploading file: $e')),
              );
            }
          } finally {
            ref.read(isUploadingProvider.notifier).state = false;
            Future.delayed(const Duration(seconds: 3), () {
              if (context.mounted) {
                ref.read(uploadStatusProvider.notifier).state = null;
              }
            });
          }
        }
      } catch (e) {
        debugPrint('Error picking file: $e');
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('File picker error: $e')));
        }
      }
    }

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: isUploading ? null : pickAndUpload,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 320,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.grey[300]!,
              style: BorderStyle
                  .solid, // Dotted border libraries exist, using solid for MVP simplicity
              width: 2,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF), // blue-50
                  shape: BoxShape.circle,
                ),
                child: isUploading
                    ? const SizedBox(
                        width: 40,
                        height: 40,
                        child: CircularProgressIndicator(
                          color: Color(0xFF2563EB),
                        ),
                      )
                    : const Icon(
                        LucideIcons.upload,
                        size: 40,
                        color: Color(0xFF2563EB), // blue-600
                      ),
              ),
              const SizedBox(height: 16),
              Text(
                uploadStatus ??
                    (isUploading ? "Uploading..." : "Upload Connections.csv"),
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
