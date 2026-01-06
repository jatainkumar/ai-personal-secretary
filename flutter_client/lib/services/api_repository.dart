import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/upload_response.dart';
import '../models/chat_response.dart';
import '../models/person.dart';

class ApiRepository {
  final String baseUrl;

  ApiRepository({
    this.baseUrl = 'https://qcuenjh6mj.us-east-1.awsapprunner.com',
  });

  // --- Helpers ---
  Map<String, String> _getHeaders(String? token) {
    // Note: The backend expects "Authorization: Bearer <token>"
    // Since we are simulating or using Google ID Token, we pass it here.
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // --- Auth ---
  Future<Map<String, dynamic>> checkAuth(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/status'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Auth check failed');
  }

  Future<void> logout(String token) async {
    await http.post(
      Uri.parse('$baseUrl/auth/logout'),
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  // --- Chat ---
  Future<ChatResponse> chat(
    String query,
    String userId, {
    String? token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/chat'),
        headers: _getHeaders(token),
        body: jsonEncode({'user_id': userId, 'query': query}),
      );

      if (response.statusCode == 200) {
        return ChatResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to chat: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Chat error: $e');
    }
  }

  // --- Files ---
  Future<List<String>> getFiles(String userId, {String? token}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/files?user_id=$userId'),
      headers: _getHeaders(token),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['files'] as List).cast<String>();
    }
    return [];
  }

  Future<void> deleteFile(
    String filename,
    String userId, {
    String? token,
  }) async {
    await http.delete(
      Uri.parse('$baseUrl/files?user_id=$userId&filename=$filename'),
      headers: _getHeaders(token),
    );
  }

  Future<UploadResponse> processDocuments(
    List<File> files,
    String userId, {
    String? token,
  }) async {
    final uri = Uri.parse('$baseUrl/process');
    final request = http.MultipartRequest('POST', uri);

    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields['user_id'] = userId;

    for (var file in files) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'files',
          file.path,
          contentType: MediaType('application', 'octet-stream'),
        ),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return UploadResponse.fromJson({
        'message': data['message'],
        'count': data['count'] ?? 0,
        'columns': [],
      });
    } else {
      throw Exception('Upload failed: ${response.body}');
    }
  }

  // --- Persons ---
  Future<List<Person>> getPersons(String userId, {String? token}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/persons?user_id=$userId'),
      headers: _getHeaders(token),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['persons'] as List).map((e) => Person.fromJson(e)).toList();
    }
    throw Exception('Failed to fetch persons');
  }

  Future<void> deletePerson(
    String personId,
    String userId, {
    String? token,
  }) async {
    await http.delete(
      Uri.parse('$baseUrl/persons/$personId?user_id=$userId'),
      headers: _getHeaders(token),
    );
  }

  Future<void> updatePerson(
    String personId,
    String userId,
    Map<String, dynamic> data, {
    String? token,
  }) async {
    await http.put(
      Uri.parse('$baseUrl/persons/$personId?user_id=$userId'),
      headers: _getHeaders(token),
      body: jsonEncode(data),
    );
  }

  // --- VCF Enrichment ---
  Future<Map<String, dynamic>> enrichFromVcf(
    List<File> files,
    String userId, {
    String? token,
  }) async {
    final uri = Uri.parse('$baseUrl/persons/enrich-from-vcf');
    final request = http.MultipartRequest('POST', uri);

    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields['user_id'] = userId;

    for (var file in files) {
      request.files.add(await http.MultipartFile.fromPath('files', file.path));
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('VCF processing failed');
  }

  Future<Map<String, dynamic>> confirmVcfEnrichment({
    required String userId,
    required String tempDir,
    required bool overwrite,
    required Map<String, String> contactActions,
    String? token,
  }) async {
    // Correcting to MultipartRequest for consistency with backend expectation of Form Data
    final uri = Uri.parse('$baseUrl/persons/confirm-vcf-enrichment');
    final request = http.MultipartRequest('POST', uri);
    if (token != null) request.headers['Authorization'] = 'Bearer $token';

    request.fields['user_id'] = userId;
    request.fields['temp_dir'] = tempDir;
    request.fields['overwrite'] = overwrite.toString();
    request.fields['contact_actions'] = jsonEncode(contactActions);

    final streamedResponse = await request.send();
    final resp = await http.Response.fromStream(streamedResponse);

    if (resp.statusCode == 200) {
      return jsonDecode(resp.body);
    }
    throw Exception('Enrichment failed: ${resp.body}');
  }

  // --- Scheduling ---
  Future<Map<String, dynamic>> confirmMeeting(
    Map<String, dynamic> meetingDetails, {
    String? token,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/schedule/confirm'),
      headers: _getHeaders(token),
      body: jsonEncode(meetingDetails),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to confirm meeting: ${response.body}');
  }
}
