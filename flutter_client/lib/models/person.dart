class Person {
  final String id;
  final String userId;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? phone;
  final String? company;
  final String? position;
  final String? url;
  final String? address;
  final String? birthday;
  final String? notes;
  final List<String> files;
  final String? createdAt;
  final String? updatedAt;

  Person({
    required this.id,
    required this.userId,
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.company,
    this.position,
    this.url,
    this.address,
    this.birthday,
    this.notes,
    this.files = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory Person.fromJson(Map<String, dynamic> json) {
    return Person(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      company: json['company'] as String?,
      position: json['position'] as String?,
      url: json['url'] as String?,
      address: json['address'] as String?,
      birthday: json['birthday'] as String?,
      notes: json['notes'] as String?,
      files:
          (json['files'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          [],
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
      'phone': phone,
      'company': company,
      'position': position,
      'url': url,
      'address': address,
      'birthday': birthday,
      'notes': notes,
      'files': files,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}
