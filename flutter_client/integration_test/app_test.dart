import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_client/main.dart';
import 'package:flutter_client/screens/home_screen.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('App smoke test - Launch and verify Dashboard', (
    WidgetTester tester,
  ) async {
    // Start app
    runApp(const ProviderScope(child: MyApp()));
    await tester.pumpAndSettle();

    // Verify HomeScreen structure
    expect(find.byType(HomeScreen), findsOneWidget);

    // Verify Sidebar exists
    expect(find.text('LinkedIn AI'), findsOneWidget);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('AI Chat'), findsOneWidget);

    // Verify Dashboard is default view
    expect(find.text('Total Connections'), findsOneWidget);
    expect(find.text('Data Columns'), findsOneWidget);
    expect(find.text('Upload Connections.csv'), findsOneWidget);

    // Navigate to Chat
    await tester.tap(find.text('AI Chat'));
    await tester.pumpAndSettle();

    // Verify Chat View
    expect(find.text('Chat with your Data'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });
}
