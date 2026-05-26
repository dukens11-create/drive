import 'package:flutter_test/flutter_test.dart';
import 'package:drive_mobile/main.dart';

void main() {
  testWidgets('renders scaffold text', (tester) async {
    await tester.pumpWidget(const DriveApp());

    expect(find.text('Drive mobile app scaffold'), findsOneWidget);
  });
}
