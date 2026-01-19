---
layout: page
title: Базовый синтаксис
---

# Базовый синтаксис

В этой лекции мы познакомимся с основами языка Scala: парадигмами программирования, системой типов и базовым синтаксисом.

## Содержание

- [Парадигмы программирования](#парадигмы-программирования)
- [Особенности Scala](#особенности-scala)
- [Литералы и операции](#литералы-и-операции)
- [Переменные](#переменные)
- [Функции](#функции)
- [Условный переход и циклы](#условный-переход-и-циклы)
- [Классы и типы](#классы-и-типы)
- [Option](#option)
- [Структура проекта](#структура-проекта)

---

## Парадигмы программирования

Scala — мультипарадигмальный язык, который поддерживает императивный, объектно-ориентированный и функциональный стили программирования.

### Императивное программирование

Традиционный стиль с изменяемым состоянием и циклами:

```scala
def sum(list: List[Vector]): Vector = {
  var sum: Vector = new Vector(0, 0)
  for (vector <- list)
    sum = sum + vector
  sum
}
```

### Объектно-ориентированное программирование

Инкапсуляция данных и поведения в объекты:

```scala
class Car() {
  private var distance: Int = 0

  def increaseDistance(): Unit = distance = distance + 1

  def zeroDistance(): Unit = distance = 0
}
```

### Функциональное программирование

Использование функций высшего порядка и неизменяемых данных:

```scala
def sum(list: List[Vector]): Vector =
  list.foldLeft(new Vector(0, 0))(_ + _)
```

---

## Особенности Scala

### Строгая типизация

Scala имеет статическую строгую типизацию, которая проверяется во время компиляции.

**Преимущества:**
- **Корректность кода** — ошибки типов обнаруживаются на этапе компиляции
- **Рефакторинг** — компилятор помогает безопасно изменять код
- **Паттерн-матчинг** — дополнительные гарантии безопасности при сопоставлении с образцом

### Автоматический вывод типов

Компилятор Scala умеет выводить типы автоматически, что делает код более лаконичным:

```scala
val question: String = "question of life"     // Явное указание типа
val answer = 42                                // Тип Int выведен автоматически

trait Pet
class Cat extends Pet
class Dog extends Pet

val pets = List(new Cat, new Dog)              // pets: List[Pet]
```

### Всё возвращает значение

В Scala все выражения возвращают значение, включая условные конструкции:

```scala
val conditionalValue = if (1 > 2) 13 else 42   // conditionalValue: Int = 42

val value = print("42")                         // value: Unit = ()
```

### Отказ от Null

В Scala принято сознательно отказываться от `null` в значениях, используя вместо этого тип `Option`. Это позволяет избавиться от `NullPointerException` на уровне типов.

---

## Литералы и операции

### Литералы

```scala
1                    // Int
true                 // Boolean
"Hello, Scala"       // String
```

### Арифметические операции

```scala
1 + 2    // сложение
2 - 1    // вычитание
2 * 3    // умножение
6 / 2    // деление
5 % 2    // остаток от деления
```

### Конкатенация строк

```scala
"Hello, " + "Scala"  // "Hello, Scala"
```

### Выражения

```scala
(1 + 2) * 3  // = 3 * 3 = 9
```

### Вызов методов

```scala
"Hello, Scala!".size   // 13
1.to(10)               // Range(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
```

### Эквивалентные записи

В Scala операторы — это методы, поэтому следующие записи эквивалентны:

```scala
3 + 2      == 3.+(2)
1.to(10)   == (1 to 10)
```

### Логические операции

```scala
1 > 1        // false
1 < 1        // false
1 >= 1       // true
1 <= 1       // true
!true        // false
true && false // false
true || false // true
```

---

## Переменные

### val — неизменяемая переменная

Значение присваивается один раз и не может быть изменено:

```scala
val radius = 10
val pi = 3.14159
pi * radius * radius   // 314.159
```

### var — изменяемая переменная

Значение может быть изменено:

```scala
var answer = -1
answer = 42
answer                 // 42
```

### lazy val — ленивая инициализация

Значение вычисляется только при первом обращении:

```scala
val x = { println("x"); 15 }
lazy val y = { println("y"); 13 }
println("a")
y
```

**Вывод:**
```
x
a
y
```

Обратите внимание: `x` вычисляется сразу при объявлении, а `y` — только при первом использовании.

### Сравнение val, var, lazy val и def

| Ключевое слово | Описание |
|----------------|----------|
| `val` | Неизменяемая переменная, вычисляется сразу при объявлении |
| `var` | Изменяемая переменная |
| `lazy val` | Неизменяемая переменная, вычисляется при первом обращении |
| `def` | Функция/метод, вычисляется при каждом вызове |

---

## Функции

### Объявление функций

```scala
def square(x: Double) = x * x

def area(radius: Double): Double =
  3.14159 * square(radius)

area(10)  // 314.159
```

### Функции с несколькими параметрами

```scala
def sumOfSquares(
  x: Double,
  y: Double
) = square(x) + square(y)
```

### Сигнатура функции

Сигнатура функции включает имя, параметры с типами и возвращаемый тип:

```scala
def power(x: Double, y: Int): Double = ...
```

### Возврат значений

**С return (не рекомендуется):**

```scala
def sum(a: Int, b: Int): Int = {
  return a + b
}
```

**Без return (идиоматично):**

```scala
def sum(a: Int, b: Int): Int = {
  a + b
}
```

**Однострочная запись:**

```scala
def sum(a: Int, b: Int): Int = a + b
```

В Scala последнее выражение в теле функции автоматически становится возвращаемым значением, поэтому `return` обычно не используется.

---

## Условный переход и циклы

### Условный переход

```scala
if (age < 18)
  "Underaged"
else
  "Adult"
```

### Цикл for

```scala
val numbers = List(1, 2, 3)
for (n <- numbers) println(n)
```

### foreach

```scala
val numbers = List(1, 2, 3)
numbers.foreach(n => println(n))
```

### for comprehension (yield)

Позволяет создавать новые коллекции на основе существующих:

```scala
val numbers = List(1, 2, 3)
val doubledNumbers =
  for (n <- numbers) yield n * 2
// List(2, 4, 6)
```

---

## Классы и типы

### Иерархия типов в Scala

В Scala все типы образуют иерархию:

- `Any` — корень иерархии, предок всех типов
  - `AnyVal` — примитивные типы (`Double`, `Float`, `Long`, `Int`, `Short`, `Byte`, `Unit`, `Boolean`, `Char`)
  - `AnyRef` (эквивалент `java.lang.Object`) — ссылочные типы (`List`, `Option`, пользовательские классы)
    - `Null` — подтип всех ссылочных типов
- `Nothing` — подтип всех типов (нижний тип)

### Nothing

`Nothing` — это тип, у которого нет значений. Используется для обозначения выражений, которые никогда не возвращают значение (например, исключения):

```scala
def isTen(number: Int): Boolean =
  if (10 == number) true
  else throw new Exception("Number is not ten")

// В стандартной библиотеке scala.sys
def error(message: String): Nothing =
  throw new RuntimeException(message)
```

### Null

`Null` — это тип, единственным значением которого является `null`. Он является подтипом всех ссылочных типов:

```scala
val a: Null = null
object Nil extends List[Nothing]  // Пустой список
```

### Trait

Trait — это абстрактный тип, похожий на интерфейс в Java, но может содержать реализацию:

**Пустой trait:**

```scala
trait HairColor
```

**Trait с методами:**

```scala
trait Iterator {
  def hasNext: Boolean
  def next(): Int
}
```

### Class

```scala
class Vehicle(description: String) {
  println("constructing...")
  val name = description + " vehicle"
  def print(): Unit = println(name)
}
```

**Класс с публичным параметром:**

```scala
class Vehicle(val description: String) {
  println("constructing...")
  def print(): Unit = println(description)
}
```

### Наследование (extends)

```scala
class Car extends Vehicle("heavy")
object FastCar extends Vehicle("fast")
trait FastCar extends Vehicle("fast")
```

**Наследование с примесями (mixins):**

```scala
class Car extends Vehicle("heavy") with Foo
object FastCar extends Vehicle("fast") with Foo
trait FastCar extends Vehicle("fast") with Foo
```

### AnyVal (Value classes)

Value class — это класс, который во время выполнения "разворачивается" в примитивное значение, избегая создания объекта в куче:

```scala
class FirstName(val value: String) extends AnyVal
```

**Case class как value class:**

```scala
case class FirstName(value: String) extends AnyVal
```

---

## Option

`Option` — это контейнер, который может содержать значение (`Some`) или быть пустым (`None`). Используется вместо `null` для безопасной работы с возможно отсутствующими значениями:

```scala
sealed abstract class Option[+A] { ... }

final case class Some[+A](value: A) extends Option[A] {
  def get: A = value
}

case object None extends Option[Nothing] {
  def get: Nothing = throw new NoSuchElementException("None.get")
}
```

**Пример использования:**

```scala
def findUser(id: Int): Option[User] = {
  // возвращает Some(user) если пользователь найден
  // или None если не найден
}

findUser(42) match {
  case Some(user) => println(s"Found: ${user.name}")
  case None       => println("User not found")
}
```

---

## Структура проекта

Типичная структура Scala-проекта с использованием sbt (Scala Build Tool):

```
root/
├── build.sbt           # Конфигурация сборки
├── project/
│   ├── build.properties # Версия sbt
│   └── plugins.sbt      # Плагины sbt
└── src/
    ├── main/
    │   └── scala/       # Исходный код
    └── test/
        └── scala/       # Тесты
```

---

[← Назад к содержанию](../index.html)
