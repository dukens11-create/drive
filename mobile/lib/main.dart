import 'package:flutter/material.dart';

void main() {
  runApp(const DriveApp());
}

class DriveApp extends StatelessWidget {
  const DriveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Drive Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
      ),
      home: const DriveHomePage(),
    );
  }
}

class DriveHomePage extends StatelessWidget {
  const DriveHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Drive mobile app scaffold'),
      ),
    );
  }
}
