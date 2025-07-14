from db_connectors import create_connector

config = {
    'database_type': 'mongodb',
    'host': 'localhost',
    'port': 27017,
    'database': 'test'
}

connector = create_connector(config)
print('Testing MongoDB connector with native queries...')

# Test insert operation
insert_query = 'db.users.insertOne({"name": "John Doe", "age": 30, "email": "john@example.com"})'
result = connector.execute_query(insert_query)
print('Insert result:', result)

# Test find with the new data
find_query = 'db.users.find({})'
result = connector.execute_query(find_query)
print('Find result:', result)

# Test update operation
update_query = 'db.users.updateOne({"name": "John Doe"}, {"$set": {"age": 31}})'
result = connector.execute_query(update_query)
print('Update result:', result)

# Test find after update
result = connector.execute_query(find_query)
print('Find after update:', result)

# Test aggregate
agg_query = 'db.users.aggregate([{"$match": {"age": {"$gte": 30}}}])'
result = connector.execute_query(agg_query)
print('Aggregate result:', result)

# Test show collections
show_query = 'show collections'
result = connector.execute_query(show_query)
print('Show collections result:', result)
