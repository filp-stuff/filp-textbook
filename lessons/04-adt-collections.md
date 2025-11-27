---
layout: page
title: ADT, коллекции, контейнеры
---

# ADT, коллекции, контейнеры

В этом разделе мы изучим алгебраические типы данных (ADT) — один из фундаментальных концептов функционального программирования, а также познакомимся со стандартными коллекциями Scala.

---

## 1. Доменная модель

### Что такое доменная модель?

**Доменная модель** (domain model) — это концептуальное представление предметной области, выраженное в виде структур данных и их взаимосвязей. Она описывает *что* существует в нашей системе и *как* эти сущности связаны между собой.

> Доменная модель — это мост между бизнес-требованиями и программным кодом.

### Формальное определение

Доменная модель состоит из:
- **Сущностей** (entities) — объекты с уникальной идентичностью
- **Значений** (value objects) — объекты, определяемые своими атрибутами
- **Отношений** между ними

### Пример: мир животных

Рассмотрим простую предметную область — приют для животных:

```
Животное
├── Кошка
│   ├── имя: String
│   ├── возраст: Int
│   └── порода: ПородаКошки
└── Собака
    ├── имя: String
    ├── возраст: Int
    └── размер: РазмерСобаки

ПородаКошки = Персидская | Сиамская | Британская | Беспородная

РазмерСобаки = Маленький | Средний | Большой
```

Обратите внимание на два важных паттерна:
1. **Животное** — это *или* кошка, *или* собака (объединение вариантов)
2. **Кошка** — это комбинация имени *и* возраста *и* породы (объединение атрибутов)

Эти два паттерна — ключ к пониманию ADT. Запомните их, скоро они нам понадобятся!

---

## 2. Record-классы: эволюция языков программирования

### Проблема: boilerplate-код

В классическом ООП для создания простого класса-данных требуется много повторяющегося кода:

```java
// Java до версии 14
public class Person {
    private final String name;
    private final int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Person person = (Person) o;
        return age == person.age && Objects.equals(name, person.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, age);
    }

    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
}
```

Это 30+ строк кода для хранения двух полей!

### Решение из функционального мира

| Язык | Конструкция | Год появления |
|------|-------------|---------------|
| **Scala** | `case class` | **2004** |
| **Kotlin** | `data class` | 2016 |
| **C#** | `record` | 2020 |
| **Java** | `record` | 2020 |

Scala предложила решение на **16 лет раньше** Java и C#!

### Сравнение синтаксиса

**Scala (2004):**
```scala
case class Person(name: String, age: Int)
```

**Java 14+ (2020):**
```java
public record Person(String name, int age) {}
```

**C# 9+ (2020):**
```csharp
public record Person(string Name, int Age);
```

**Kotlin (2016):**
```kotlin
data class Person(val name: String, val age: Int)
```

### Что даёт record/case class автоматически?

- Неизменяемые поля (immutable by default)
- Конструктор
- Геттеры
- `equals()` и `hashCode()` по значению
- `toString()`
- Метод копирования (`copy` в Scala)
- Декомпозиция (pattern matching)

> Идея record-классов пришла из функционального программирования, где неизменяемость данных — норма, а не исключение.

---

## 3. Product Type (Произведение типов)

### Определение

**Product type** (тип-произведение) — это составной тип, содержащий значения *всех* указанных типов одновременно.

Это то, что мы привыкли называть "структурой" или "записью":

```scala
case class Person(name: String, age: Int)
//               ^^^^^^^        ^^^
//               String   И     Int
```

`Person` — это произведение `String` и `Int`. Чтобы создать `Person`, нужно предоставить *и* `name`, *и* `age`.

### Case-классы в Scala

Case-класс — это реализация Product type в Scala:

```scala
case class Cat(name: String, age: Int, breed: CatBreed)

// Создание
val whiskers = Cat("Whiskers", 3, Persian)

// Копирование с изменением
val olderWhiskers = whiskers.copy(age = 4)

// Pattern matching
whiskers match {
  case Cat(name, age, _) => println(s"$name is $age years old")
}
```

### Кортежи как Product types

Scala также имеет встроенные кортежи:

```scala
val pair: (String, Int) = ("Alice", 25)
val triple: (String, Int, Boolean) = ("Bob", 30, true)

// Доступ к элементам
pair._1  // "Alice"
pair._2  // 25
```

### Кардинальность произведения типов

**Кардинальность типа** — это количество возможных значений (обитателей) этого типа.

Для произведения типов:

$$|A \times B| = |A| \times |B|$$

**Пример:**

```scala
// Boolean имеет 2 значения: true, false
// |Boolean| = 2

case class TwoBools(a: Boolean, b: Boolean)
// |TwoBools| = |Boolean| × |Boolean| = 2 × 2 = 4

// Возможные значения:
// TwoBools(false, false)
// TwoBools(false, true)
// TwoBools(true, false)
// TwoBools(true, true)
```

Ещё пример:

```scala
sealed trait Size
case object Small extends Size   // 1
case object Medium extends Size  // 1
case object Large extends Size   // 1
// |Size| = 3

case class Product(inStock: Boolean, size: Size)
// |Product| = |Boolean| × |Size| = 2 × 3 = 6
```

---

## 4. Coproduct Type (Сумма типов)

### Определение

**Coproduct type** (тип-сумма, sum type) — это тип, значение которого может быть *одним из* нескольких вариантов.

Это то, что мы называем "перечисление" или "union type":

```scala
sealed trait Animal
case class Cat(name: String) extends Animal
case class Dog(name: String) extends Animal
//              ИЛИ
```

`Animal` — это сумма `Cat` и `Dog`. Значение `Animal` может быть *или* `Cat`, *или* `Dog`, но не одновременно.

### Sealed traits в Scala

`sealed` означает, что все наследники должны быть определены в том же файле:

```scala
sealed trait TrafficLight
case object Red extends TrafficLight
case object Yellow extends TrafficLight
case object Green extends TrafficLight
```

Это даёт компилятору возможность проверять полноту pattern matching:

```scala
def action(light: TrafficLight): String = light match {
  case Red => "Stop"
  case Yellow => "Prepare"
  // Компилятор предупредит: "match may not be exhaustive"
  // отсутствует case Green
}
```

### Scala 3: enum

В Scala 3 появился более лаконичный синтаксис:

```scala
enum TrafficLight:
  case Red, Yellow, Green

enum Animal:
  case Cat(name: String)
  case Dog(name: String)
```

### Кардинальность суммы типов

Для суммы типов:

$$|A + B| = |A| + |B|$$

**Пример:**

```scala
sealed trait Bool
case object True extends Bool
case object False extends Bool
// |Bool| = 1 + 1 = 2

sealed trait TrafficLight
case object Red extends TrafficLight
case object Yellow extends TrafficLight
case object Green extends TrafficLight
// |TrafficLight| = 1 + 1 + 1 = 3
```

Для вариантов с данными:

```scala
sealed trait Animal
case class Cat(age: Int) extends Animal  // age: 0..Int.MaxValue
case class Dog(age: Int) extends Animal
// |Animal| = |Cat| + |Dog| = |Int| + |Int| = 2 × |Int|
```

---

## 5. Algebraic Data Types (ADT)

### Определение

**Algebraic Data Type (ADT)** — это составной тип данных, образованный комбинацией:
- **Product types** (И — произведение)
- **Coproduct types** (ИЛИ — сумма)

Название "алгебраический" происходит от того, что эти типы подчиняются алгебраическим законам (ассоциативность, дистрибутивность и т.д.).

### Пример: доменная модель приюта

```scala
// Сумма типов (ИЛИ)
sealed trait Animal

// Произведение типов (И)
case class Cat(
  name: String,
  age: Int,
  breed: CatBreed
) extends Animal

case class Dog(
  name: String,
  age: Int,
  size: DogSize
) extends Animal

// Ещё одна сумма
sealed trait CatBreed
case object Persian extends CatBreed
case object Siamese extends CatBreed
case object British extends CatBreed
case object Mixed extends CatBreed

sealed trait DogSize
case object Small extends DogSize
case object Medium extends DogSize
case object Large extends DogSize
```

### Почему ADT важны?

1. **Полнота проверки** — компилятор гарантирует обработку всех случаев
2. **Невозможность невалидных состояний** — "make illegal states unrepresentable"
3. **Самодокументируемость** — структура кода отражает предметную область
4. **Паттерн-матчинг** — элегантная работа с вариантами

### Пример: невалидные состояния

Плохо (возможны невалидные состояния):

```scala
class User(
  var email: String,        // может быть null
  var emailVerified: Boolean // true при email = null?!
)
```

Хорошо (невалидные состояния невозможны):

```scala
sealed trait User
case class UnverifiedUser(email: String) extends User
case class VerifiedUser(email: String, verifiedAt: Instant) extends User
// emailVerified = true невозможен без email
```

---

## 6. Алгебра типов: кардинальность

### Основные правила

| Тип | Кардинальность | Пояснение |
|-----|----------------|-----------|
| `Nothing` | 0 | Нет значений |
| `Unit` | 1 | Единственное значение: `()` |
| `Boolean` | 2 | `true`, `false` |
| `Byte` | 256 | -128 до 127 |
| `A × B` (Product) | \|A\| × \|B\| | Произведение |
| `A + B` (Coproduct) | \|A\| + \|B\| | Сумма |
| `A → B` (Function) | \|B\|^{\|A\|} | Степень |

### Формулы кардинальности

```
|Nothing| = 0
|Unit| = 1
|Boolean| = 2

|A × B| = |A| × |B|      -- произведение типов
|A + B| = |A| + |B|      -- сумма типов
|A → B| = |B|^|A|        -- функция

|Option[A]| = |A| + 1    -- Some(a) или None
|Either[A, B]| = |A| + |B|
|(A, B)| = |A| × |B|
|List[A]| = 1 + |A| + |A|² + |A|³ + ... = ∞  -- для любого |A| > 0
```

### Примеры расчёта

**Option[Boolean]:**
```scala
|Option[Boolean]| = |Boolean| + 1 = 2 + 1 = 3
// Значения: None, Some(true), Some(false)
```

**Either[Boolean, Unit]:**
```scala
|Either[Boolean, Unit]| = |Boolean| + |Unit| = 2 + 1 = 3
// Значения: Left(true), Left(false), Right(())
```

**(Boolean, Boolean):**
```scala
|(Boolean, Boolean)| = |Boolean| × |Boolean| = 2 × 2 = 4
// Значения: (false,false), (false,true), (true,false), (true,true)
```

**Boolean => Boolean:**
```scala
|Boolean => Boolean| = |Boolean|^|Boolean| = 2^2 = 4
// Функции: const false, const true, id, not
```

### Изоморфизм типов

Типы с одинаковой кардинальностью **изоморфны** — между ними можно установить взаимно-однозначное соответствие:

```scala
// |Option[Nothing]| = |Nothing| + 1 = 0 + 1 = 1 = |Unit|
// Option[Nothing] ≅ Unit

// |Either[A, Nothing]| = |A| + 0 = |A|
// Either[A, Nothing] ≅ A

// |(A, Unit)| = |A| × 1 = |A|
// (A, Unit) ≅ A
```

---

## 7. Стандартные ADT в Scala

### Option[A]

Представляет наличие или отсутствие значения:

```scala
sealed trait Option[+A]
case class Some[+A](value: A) extends Option[A]
case object None extends Option[Nothing]
```

**Кардинальность:** `|Option[A]| = |A| + 1`

```scala
val maybeNumber: Option[Int] = Some(42)
val nothing: Option[Int] = None

// Безопасная работа
maybeNumber match {
  case Some(n) => println(s"Got $n")
  case None => println("Nothing here")
}

// Методы
maybeNumber.getOrElse(0)      // 42
nothing.getOrElse(0)          // 0
maybeNumber.map(_ * 2)        // Some(84)
maybeNumber.filter(_ > 50)    // None
```

### Either[L, R]

Представляет одно из двух возможных значений:

```scala
sealed trait Either[+L, +R]
case class Left[+L](value: L) extends Either[L, Nothing]
case class Right[+R](value: R) extends Either[Nothing, R]
```

**Кардинальность:** `|Either[L, R]| = |L| + |R|`

По соглашению: `Left` — ошибка, `Right` — успех.

```scala
def divide(a: Int, b: Int): Either[String, Int] =
  if (b == 0) Left("Division by zero")
  else Right(a / b)

divide(10, 2)  // Right(5)
divide(10, 0)  // Left("Division by zero")

// Работа с результатом
divide(10, 2).map(_ * 2)           // Right(10)
divide(10, 0).map(_ * 2)           // Left("Division by zero")
divide(10, 2).getOrElse(0)         // 5
```

### Try[A]

Представляет результат вычисления, которое может бросить исключение:

```scala
sealed trait Try[+A]
case class Success[+A](value: A) extends Try[A]
case class Failure(exception: Throwable) extends Try[Nothing]
```

```scala
import scala.util.{Try, Success, Failure}

val result: Try[Int] = Try("42".toInt)     // Success(42)
val failed: Try[Int] = Try("abc".toInt)    // Failure(NumberFormatException)

result.getOrElse(0)        // 42
failed.getOrElse(0)        // 0
result.map(_ * 2)          // Success(84)
failed.recover { case _: NumberFormatException => 0 }  // Success(0)
```

### List[A]

Односвязный список — классический рекурсивный ADT:

```scala
sealed trait List[+A]
case object Nil extends List[Nothing]
case class Cons[+A](head: A, tail: List[A]) extends List[A]

// В стандартной библиотеке используется :: вместо Cons
// list = 1 :: 2 :: 3 :: Nil
```

**Кардинальность:** `|List[A]| = 1 + |A| × |List[A]|`

Это рекурсивное уравнение, решение которого — бесконечность (для |A| > 0).

```scala
val numbers = List(1, 2, 3, 4, 5)

// Pattern matching
numbers match {
  case Nil => "empty"
  case head :: tail => s"head: $head, tail: $tail"
}

// Основные операции
numbers.head           // 1
numbers.tail           // List(2, 3, 4, 5)
numbers.map(_ * 2)     // List(2, 4, 6, 8, 10)
numbers.filter(_ > 2)  // List(3, 4, 5)
numbers.foldLeft(0)(_ + _)  // 15
```

---

## 8. Коллекции Scala

Scala имеет богатую библиотеку коллекций с единообразным API. Коллекции делятся на три основные категории:

### Иерархия коллекций

<!-- TODO: Добавить изображение иерархии неизменяемых коллекций -->
*[Placeholder: Диаграмма иерархии immutable коллекций]*

<!-- TODO: Добавить изображение иерархии изменяемых коллекций -->
*[Placeholder: Диаграмма иерархии mutable коллекций]*

<!-- TODO: Добавить изображение общей иерархии -->
*[Placeholder: Общая диаграмма иерархии коллекций]*

### Основные трейты

```
Iterable
├── Seq (последовательности)
│   ├── IndexedSeq (быстрый доступ по индексу)
│   │   ├── Vector
│   │   ├── Array
│   │   └── ArraySeq
│   └── LinearSeq (быстрый доступ к голове)
│       ├── List
│       └── LazyList
├── Set (множества)
│   ├── HashSet
│   ├── TreeSet
│   └── BitSet
└── Map (словари)
    ├── HashMap
    ├── TreeMap
    └── ListMap
```

### Неизменяемые vs изменяемые

```scala
import scala.collection.immutable._  // по умолчанию
import scala.collection.mutable._    // нужно импортировать явно
```

| Аспект | Immutable | Mutable |
|--------|-----------|---------|
| Изменения | Возвращают новую коллекцию | Модифицируют на месте |
| Потокобезопасность | Безопасны | Требуют синхронизации |
| Использование | По умолчанию в FP | Для оптимизации |

### Основные операции

```scala
val list = List(1, 2, 3, 4, 5)

// Трансформации
list.map(_ * 2)           // List(2, 4, 6, 8, 10)
list.filter(_ > 2)        // List(3, 4, 5)
list.flatMap(x => List(x, x))  // List(1, 1, 2, 2, 3, 3, 4, 4, 5, 5)

// Агрегации
list.foldLeft(0)(_ + _)   // 15
list.reduce(_ + _)        // 15
list.sum                  // 15

// Доступ
list.head                 // 1
list.tail                 // List(2, 3, 4, 5)
list(2)                   // 3 (apply)

// Проверки
list.isEmpty              // false
list.contains(3)          // true
list.forall(_ > 0)        // true
list.exists(_ > 4)        // true

// Группировка
list.grouped(2).toList    // List(List(1, 2), List(3, 4), List(5))
list.partition(_ > 2)     // (List(3, 4, 5), List(1, 2))
list.groupBy(_ % 2)       // Map(1 -> List(1, 3, 5), 0 -> List(2, 4))

// Сортировка
list.sorted               // List(1, 2, 3, 4, 5)
list.sortBy(-_)           // List(5, 4, 3, 2, 1)
list.reverse              // List(5, 4, 3, 2, 1)
```

### For-comprehensions

Синтаксический сахар для работы с коллекциями:

```scala
// Эквивалентные записи
for {
  x <- List(1, 2, 3)
  y <- List("a", "b")
} yield (x, y)

// Это то же самое, что:
List(1, 2, 3).flatMap(x =>
  List("a", "b").map(y =>
    (x, y)))

// Результат: List((1,a), (1,b), (2,a), (2,b), (3,a), (3,b))
```

С фильтрацией:

```scala
for {
  x <- 1 to 10
  if x % 2 == 0
  y <- 1 to x
  if y % 3 == 0
} yield (x, y)
```

---

## 9. Сравнение производительности коллекций

### Обозначения сложности

| Символ | Значение |
|--------|----------|
| C | Константное время O(1) |
| L | Линейное время O(n) |
| eC | Эффективно константное (амортизированное) |
| aC | Амортизированное константное |
| Log | Логарифмическое O(log n) |
| - | Операция не поддерживается |

### Неизменяемые коллекции (Immutable)

| Коллекция | head | tail | apply | update | prepend | append | insert |
|-----------|------|------|-------|--------|---------|--------|--------|
| `List` | C | C | L | L | C | L | - |
| `LazyList` | C | C | L | L | C | L | - |
| `ArraySeq` | C | L | C | L | L | L | - |
| `Vector` | eC | eC | eC | eC | eC | eC | - |
| `Queue` | aC | aC | L | L | C | C | - |
| `Range` | C | C | C | - | - | - | - |
| `String` | C | L | C | L | L | L | - |

### Изменяемые коллекции (Mutable)

| Коллекция | head | tail | apply | update | prepend | append | insert |
|-----------|------|------|-------|--------|---------|--------|--------|
| `ArrayBuffer` | C | L | C | C | L | aC | L |
| `ListBuffer` | C | L | L | L | C | C | L |
| `StringBuilder` | C | L | C | C | L | aC | L |
| `Queue` (mutable) | C | L | L | L | C | C | L |
| `ArraySeq` | C | L | C | C | - | - | - |
| `Stack` | C | L | L | L | C | L | L |
| `Array` | C | L | C | C | - | - | - |
| `ArrayDeque` | C | L | C | C | aC | aC | L |

### Рекомендации по выбору коллекции

**Для последовательностей:**
- **`List`** — когда часто работаете с головой/хвостом, рекурсивная обработка
- **`Vector`** — универсальный выбор, хорошая производительность для всех операций
- **`Array`** — когда нужна максимальная производительность и совместимость с Java

**Для множеств:**
- **`HashSet`** — быстрый поиск O(1)
- **`TreeSet`** — когда нужен порядок элементов O(log n)

**Для словарей:**
- **`HashMap`** — быстрый доступ O(1)
- **`TreeMap`** — когда нужен порядок ключей O(log n)

---

## Резюме

В этом разделе мы изучили:

1. **Доменная модель** — способ представления предметной области в коде
2. **Record-классы** — концепция из FP, пришедшая в mainstream языки
3. **Product types** — типы-произведения (case classes, кортежи)
4. **Coproduct types** — типы-суммы (sealed traits, enums)
5. **ADT** — алгебраические типы данных, комбинация product и coproduct
6. **Кардинальность** — количество возможных значений типа
7. **Стандартные ADT** — Option, Either, Try, List
8. **Коллекции Scala** — иерархия, операции, производительность

ADT — это мощный инструмент моделирования, позволяющий:
- Делать невалидные состояния невозможными
- Получать проверки полноты от компилятора
- Писать выразительный и безопасный код

---

[← Назад к содержанию](../index.html)
