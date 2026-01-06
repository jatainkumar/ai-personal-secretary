import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class MeetingModal extends StatelessWidget {
  final Map<String, dynamic> meetingDetails;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const MeetingModal({
    super.key,
    required this.meetingDetails,
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final startTime = DateTime.parse(meetingDetails['start_time']);
    final endTime = DateTime.parse(meetingDetails['end_time']);
    final summary = meetingDetails['summary'] ?? 'No Title';
    final description = meetingDetails['description'] ?? '';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Confirm Meeting',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildDetailRow(
              Icons.event,
              DateFormat('EEEE, MMMM d, yyyy').format(startTime),
            ),
            _buildDetailRow(
              Icons.access_time,
              '${DateFormat.jm().format(startTime)} - ${DateFormat.jm().format(endTime)}',
            ),
            _buildDetailRow(Icons.title, summary),
            if (description.isNotEmpty)
              _buildDetailRow(Icons.description, description),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: onCancel, child: const Text('Cancel')),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: onConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Schedule'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: GoogleFonts.inter(fontSize: 16))),
        ],
      ),
    );
  }
}
