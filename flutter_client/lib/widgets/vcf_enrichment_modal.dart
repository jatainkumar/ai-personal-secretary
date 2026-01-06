import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';

class VcfEnrichmentModal extends ConsumerStatefulWidget {
  const VcfEnrichmentModal({super.key});

  @override
  ConsumerState<VcfEnrichmentModal> createState() => _VcfEnrichmentModalState();
}

class _VcfEnrichmentModalState extends ConsumerState<VcfEnrichmentModal> {
  bool _overwrite = false;
  // Initialize with a simple implementation, expanding later if needed

  @override
  Widget build(BuildContext context) {
    final report = ref.watch(vcfMatchReportProvider);
    if (report == null) return const SizedBox.shrink();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 800),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Import Contacts',
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Found ${report['total_vcf_contacts']} contacts in VCF file.',
                style: GoogleFonts.inter(fontSize: 14),
              ),
              const SizedBox(height: 8),
              _buildStat(
                'Exact Matches',
                report['exact_matches_count'],
                Colors.green,
              ),
              _buildStat(
                'Partial Matches',
                report['partial_matches_count'],
                Colors.orange,
              ),
              _buildStat(
                'New Contacts',
                report['new_contacts_count'],
                Colors.blue,
              ),

              const SizedBox(height: 24),
              CheckboxListTile(
                title: const Text('Overwrite existing data for matches?'),
                value: _overwrite,
                onChanged: (val) => setState(() => _overwrite = val ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),

              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () {
                      ref.read(vcfMatchReportProvider.notifier).state = null;
                      ref.read(vcfTempDirProvider.notifier).state = null;
                      Navigator.of(context).pop();
                    },
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: _confirmEnrichment,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Import & Enrich'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String label, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(
            '$label: $count',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmEnrichment() async {
    final userId = ref.read(userIdProvider);
    final tempDir = ref.read(vcfTempDirProvider);
    // Simple logic: all exact matches get merged if overwrite is true (or always? matches Vite logic simplified)
    // Vite Logic: User can select action per contact.
    // Here: Bulk action for simplicity in Flutter MVP.
    // If exact match -> merge. If not -> create.

    // Construct simplified actions map: 'merge' for all exact, 'create' for others
    // Real implementation should iterate all_contacts from report, but we'll cheat for MVP
    // and assume backend handles 'default' well or we send empty logic?
    // Actually, backend REQUIRES contact_actions map.

    // Better MVP: Just send empty actions and let backend fail? No.
    // Let's assume we 'merge' everything if overwrite is on, else 'skip'?
    // Let's build a basic map.
    final report = ref.read(vcfMatchReportProvider);
    final contacts = report!['all_contacts'] as List;
    final actions = <String, String>{};

    for (var c in contacts) {
      if (c['match_type'] == 'exact') {
        actions[c['index'].toString()] = 'merge';
      } else {
        actions[c['index'].toString()] = 'create';
      }
    }

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      navigator.pop(); // Close dialog first

      final res = await ref
          .read(apiRepositoryProvider)
          .confirmVcfEnrichment(
            userId: userId!,
            tempDir: tempDir!,
            overwrite: _overwrite,
            contactActions: actions,
          );

      messenger.showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Import successful')),
      );
      // Refresh contacts
      final persons = await ref.read(apiRepositoryProvider).getPersons(userId);
      ref.read(personsProvider.notifier).state = persons;

      // Cleanup
      ref.read(vcfMatchReportProvider.notifier).state = null;
      ref.read(vcfTempDirProvider.notifier).state = null;
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Import failed: $e')));
    }
  }
}
